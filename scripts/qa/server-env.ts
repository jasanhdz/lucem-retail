export function qaServerEnvironment(env: Record<string, string | undefined>): NodeJS.ProcessEnv {
  const port = env.QA_SERVER_PORT || '3113';
  const syntheticCloudflareHeaders = env.QA_RUN === '1' &&
    env.QA_LAB_RUN_LOCK_HELD === '1' &&
    env.QA_TEST_CF_HEADERS === '1' && port === '3114' &&
    env.QA_DATABASE_URL === env.E2E_DATABASE_URL;
  return {
    ...env,
    QA_SERVER_PORT: port,
    CLOUDFLARE_QUICK_TUNNEL_ENABLED: syntheticCloudflareHeaders ? 'true' : 'false',
    NEXT_DIST_DIR: '.next-qa',
  } as unknown as NodeJS.ProcessEnv;
}
