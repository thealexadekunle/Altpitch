/**
 * Prompt-injection boundary (Corrections 02). Job posts and attachment text are
 * attacker-controlled — anyone can post a job on Upwork. Every place raw client text enters a
 * prompt, it's wrapped here rather than concatenated directly, so the instruction to treat it as
 * data-only sits right next to the data itself.
 */
export function wrapUntrustedData(label: string, content: string): string {
  return `<untrusted_data label="${label}">\n${content}\n</untrusted_data>`;
}
