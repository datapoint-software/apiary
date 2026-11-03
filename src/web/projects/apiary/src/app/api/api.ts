import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { ApiProblem, isApiProblem } from '@datapoint/apiary-ui';
import { firstValueFrom } from 'rxjs';

function toProblem(error: unknown): ApiProblem {
  if (error instanceof HttpErrorResponse && isApiProblem(error.error)) {
    return error.error;
  }
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  return { status, code: status === 0 ? 'network.offline' : 'internal' };
}

@Service()
export class Api {
  private readonly http = inject(HttpClient);
  readonly version = signal(0);

  async send<T>(action: string, body: object = {}): Promise<T> {
    try {
      const result = await firstValueFrom(this.http.post<T>(this.url(action), body));
      this.version.update((v) => v + 1);
      return result;
    } catch (error) {
      throw toProblem(error);
    }
  }

  query(action: string, body: object = {}) {
    this.version();
    return { url: this.url(action), method: 'POST', body };
  }

  private url(action: string): string {
    return `/api/${action.replaceAll('.', '/')}`;
  }
}
