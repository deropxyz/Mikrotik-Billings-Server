import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  ForbiddenException,
} from '@nestjs/common';
import {
  GoogleGenerativeAI,
  type FunctionDeclaration,
  type Part,
} from '@google/generative-ai';
import type { AiTool } from './tools/tool.interface.js';
import { GetCustomerTool } from './tools/get-customer.tool.js';
import { GetUnpaidCustomersTool } from './tools/get-unpaid-customers.tool.js';
import { GetCustomerStatusTool } from './tools/get-customer-status.tool.js';
import { GetRouterStatusTool } from './tools/get-router-status.tool.js';
import { DisconnectCustomerTool } from './tools/disconnect-customer.tool.js';
import { ReconnectCustomerTool } from './tools/reconnect-customer.tool.js';
import { ConfirmActionTool } from './tools/confirm-action.tool.js';

const SYSTEM_PROMPT = `Kamu adalah asisten AI untuk aplikasi Billing RT/RW Net berbahasa Indonesia.
Tugasmu membantu operator mengelola pelanggan, tagihan, dan status jaringan MikroTik.
Jawablah dengan ringkas, akurat, informatif, dan dalam bahasa Indonesia yang sopan.
Gunakan tools yang tersedia untuk mengambil data aktual dari sistem.
Jangan mengarang data atau berasumsi tanpa memanggil tool. Jika data tidak ditemukan, sampaikan dengan jelas kepada operator.
Format jawabanmu menggunakan Markdown rapi jika menampilkan daftar atau detail teknis.

ATURAN PENTING UNTUK AKSI BERBAHAYA (DISCONNECT / RECONNECT):
1. Saat tool disconnect_customer atau reconnect_customer mengembalikan objek dengan { requiresConfirmation: true }, JANGAN langsung memanggil confirm_action.
2. Kamu WAJIB menyertakan seluruh objek JSON hasil tool tersebut secara utuh (di dalam code block \`\`\`json) pada teks balasanmu agar sistem frontend dapat memicu dialog konfirmasi visual.
Contoh format balasan wajib:
<Pesan konfirmasi untuk operator>
\`\`\`json
{"requiresConfirmation": true, "confirmationToken": "...", "action": "...", "details": {...}, "confirmationMessage": "...", "expiresAt": "..."}
\`\`\`
3. Jika operator kemudian memberikan persetujuan (seperti "ya", "lanjutkan", "setuju", "ok", atau "Konfirmasi aksi dengan token: ..."), segera panggil tool confirm_action menggunakan confirmation_token dari aksi yang tertunda tersebut!
4. Jika operator menolak (seperti "batal", "tidak", "jangan"), batalkan aksi dan sampaikan bahwa aksi telah dibatalkan tanpa memanggil confirm_action.
5. Token konfirmasi berlaku selama 2 menit.`;

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly tools: AiTool[];

  constructor(
    private readonly getCustomerTool: GetCustomerTool,
    private readonly getUnpaidCustomersTool: GetUnpaidCustomersTool,
    private readonly getCustomerStatusTool: GetCustomerStatusTool,
    private readonly getRouterStatusTool: GetRouterStatusTool,
    private readonly disconnectCustomerTool: DisconnectCustomerTool,
    private readonly reconnectCustomerTool: ReconnectCustomerTool,
    private readonly confirmActionTool: ConfirmActionTool,
  ) {
    this.tools = [
      this.getCustomerTool,
      this.getUnpaidCustomersTool,
      this.getCustomerStatusTool,
      this.getRouterStatusTool,
      this.disconnectCustomerTool,
      this.reconnectCustomerTool,
      this.confirmActionTool,
    ];
  }

  /**
   * Mengambil daftar deklarasi fungsi untuk Gemini tools
   */
  private getFunctionDeclarations(): FunctionDeclaration[] {
    return this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as any,
    }));
  }

  /**
   * Dispatch eksekusi tool berdasarkan nama dan arguments
   */
  async handleToolCall(
    toolName: string,
    args: Record<string, unknown>,
    userRole?: string,
  ): Promise<unknown> {
    const destructiveTools = ['disconnect_customer', 'reconnect_customer', 'confirm_action'];
    if (destructiveTools.includes(toolName) && userRole && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        `Akses ditolak: Tool ${toolName} hanya dapat dieksekusi oleh role ADMIN`,
      );
    }

    const tool = this.tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" tidak ditemukan`);
    }

    this.logger.log(`Executing tool: ${toolName} with args: ${JSON.stringify(args)}`);
    return tool.execute(args);
  }

  /**
   * Memproses chat dari operator menggunakan Gemini dan tool calling loop
   */
  async processChat(
    userId: string,
    message: string,
    history?: Array<{ role: 'user' | 'model'; content: string }>,
    userRole?: string,
  ): Promise<string> {
    if (userRole && userRole !== 'ADMIN') {
      throw new ForbiddenException('Akses ditolak: Hanya ADMIN yang dapat menggunakan AI Chat');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Layanan AI belum dikonfigurasi pada server.',
      );
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      tools: [
        {
          functionDeclarations: this.getFunctionDeclarations(),
        },
      ],
    });

    const formattedHistory =
      history && history.length > 0
        ? history.map((item) => ({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.content }],
          }))
        : undefined;

    const chat = model.startChat({
      history: formattedHistory,
    });

    try {
      let result = await chat.sendMessage(message);
      let response = result.response;
      let functionCalls = response.functionCalls();

      const maxTurns = 10;
      let currentTurn = 0;

      while (functionCalls && functionCalls.length > 0 && currentTurn < maxTurns) {
        currentTurn++;
        const functionResponseParts: Part[] = [];

        for (const call of functionCalls) {
          let toolResult: unknown;
          try {
            toolResult = await this.handleToolCall(
              call.name,
              (call.args as Record<string, unknown>) || {},
              userRole,
            );
          } catch (err) {
            this.logger.error(`Error executing tool ${call.name}:`, err);
            const safeMsg = err instanceof Error ? err.message : 'Terjadi kesalahan pada tool';
            toolResult = {
              error: safeMsg.replace(/password=[^\s&]+/gi, 'password=***'),
            };
          }

          functionResponseParts.push({
            functionResponse: {
              name: call.name,
              response:
                typeof toolResult === 'object' && toolResult !== null
                  ? (toolResult as Record<string, unknown>)
                  : { result: toolResult },
            },
          });
        }

        result = await chat.sendMessage(functionResponseParts);
        response = result.response;
        functionCalls = response.functionCalls();
      }

      const textReply = response.text();
      return textReply || 'Maaf, sistem tidak menghasilkan respon teks.';
    } catch (err) {
      this.logger.error('Error in processChat:', err);
      if (err instanceof ForbiddenException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      throw new ServiceUnavailableException(
        'Gagal berkomunikasi dengan model AI. Silakan coba beberapa saat lagi.',
      );
    }
  }
}
