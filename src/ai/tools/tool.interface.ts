export interface AiTool {
  /** Nama tool yang dipanggil AI — harus snake_case */
  name: string;

  /** Deskripsi singkat (dipakai sebagai deskripsi ke LLM) */
  description: string;

  /**
   * JSON Schema untuk parameter yang diterima tool ini.
   * Digunakan sebagai `parameters` dalam definisi tool ke LLM.
   */
  parameters: Record<string, unknown>;

  /**
   * Eksekusi tool dan kembalikan hasil sebagai string atau object.
   * AI akan menerima hasil ini sebagai tool result.
   */
  execute(args: Record<string, unknown>): Promise<unknown>;
}
