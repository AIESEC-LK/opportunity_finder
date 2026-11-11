/** Thrown when the data source can't be read; pages show it as "temporarily unavailable". */
export class SourceUnavailableError extends Error {
  constructor(
    message: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "SourceUnavailableError";
  }
}
