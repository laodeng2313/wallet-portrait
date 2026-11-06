export class PortraitError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "PortraitError";
    this.exitCode = exitCode;
  }
}
