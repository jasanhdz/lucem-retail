import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const script = path.resolve('scripts/qa/provision-db.sh');
function classify(functionName: string, response: string) {
  return spawnSync('bash', ['-c', `source "$1"; ${functionName} "$2"`, 'bash', script, response], { encoding: 'utf8' }).status === 0;
}

describe('QA database provisioner inspect guards', () => {
  it('recognizes Docker container-not-found responses without masking other errors', () => {
    expect(classify('container_inspect_indicates_missing', 'Error: No such container: lucem-qa-01d-postgres')).toBe(true);
    expect(classify('container_inspect_indicates_missing', 'Error response from daemon: No such object: lucem-qa-01d-postgres')).toBe(true);
    expect(classify('container_inspect_indicates_missing', 'permission denied while connecting to Docker')).toBe(false);
  });

  it('recognizes only the Docker volume-not-found response', () => {
    expect(classify('volume_inspect_indicates_missing', 'Error response from daemon: get lucem-qa-01d-postgres-data: no such volume')).toBe(true);
    expect(classify('volume_inspect_indicates_missing', 'permission denied while connecting to Docker')).toBe(false);
  });
});
