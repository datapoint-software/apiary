export class RecordingDialogRef {
  readonly results: unknown[] = [];

  close(result?: unknown): void {
    this.results.push(result);
  }
}
