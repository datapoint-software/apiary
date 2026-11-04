import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { vi } from 'vitest';

export async function nextRequest(
  backend: HttpTestingController,
  url: string,
): Promise<TestRequest> {
  return vi.waitFor(() => backend.expectOne(url));
}
