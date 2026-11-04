import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ClusterView } from '../api/models';
import { ClusterStatus } from '../cluster/cluster-status';
import { aCluster } from './builders';

export async function nextRequest(
  backend: HttpTestingController,
  url: string,
): Promise<TestRequest> {
  return vi.waitFor(() => backend.expectOne(url));
}

export async function answerClusterStatus(
  backend: HttpTestingController,
  cluster: ClusterView = aCluster(),
): Promise<void> {
  TestBed.inject(ClusterStatus);
  (await nextRequest(backend, '/api/cluster/status')).flush(cluster);
}
