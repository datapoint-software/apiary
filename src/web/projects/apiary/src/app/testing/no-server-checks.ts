import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

export const noServerChecks: HttpInterceptorFn = (request, next) =>
  request.url.endsWith('/check') ? of(new HttpResponse({ status: 200, body: [] })) : next(request);
