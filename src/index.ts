export interface Env {
  BUCKET_ID: string;
  BUCKET_NAME: string;
  BUCKET_AUTHORIZATION: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
}

/**
 * 自定义配置
 */
const validDurationInSeconds = 7 * 24 * 60 * 60; // 设置授权令牌最长失效时长 7 天
const workerName = "work-cw4b2-01"; // 设置 Cloudflare Worker 的名称

/**
 * Backblaze B2 接口
 */
const b2_authorize_account =
    "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
  b2_get_download_authorization = "/b2api/v2/b2_get_download_authorization";

/**
 * 登录 Backblaze B2, 返回可用于帐户级操作的授权令牌
 */
async function b2AuthorizeAccount({ BUCKET_AUTHORIZATION }: Env) {
  return await fetch(b2_authorize_account, {
    headers: { Authorization: BUCKET_AUTHORIZATION },
  }).then((res) => res.json());
}

/**
 * 生成可用于从私有 B2 存储桶下载文件的授权令牌
 */
async function b2GetDownloadAuthorization(
  arg: Env & { BUCKET_ID: string; apiUrl: string; authorizationToken: string }
) {
  return await fetch(arg.apiUrl + b2_get_download_authorization, {
    method: "POST",
    headers: {
      Authorization: arg.authorizationToken,
    },
    body: JSON.stringify({
      bucketId: arg.BUCKET_ID,
      fileNamePrefix: "",
      validDurationInSeconds,
    }),
  }).then((res) => res.json());
}

/**
 * 创建 Work
 */
async function uploadWorker<T extends Env & { authorizationToken: string }>(
  configs: T
) {
  const workerCode = `
	addEventListener("fetch",(event)=>{
		event.respondWith(handleRequest(event.request))
	})

	async function handleRequest(request) {
		const headers = new Headers(request.headers)
		headers.append("Authorization", "${configs.authorizationToken}")
		const url = new URL(request.url)
		return await fetch(\`\${url.protocol}//f005.backblazeb2.com/file/${configs.BUCKET_NAME}/\${url.pathname.includes("poster")?"poster/":""}\${url.pathname.match(/[0-9a-z]+.(jpg|jpeg|webp|png|gif|JPG|JPEG|WEBP|PNG|GIF)$/)[0]}\`, {
			method: request.method, headers
		})
	}
  `;
  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${configs.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerName}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${configs.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/javascript",
      },
      body: workerCode,
    }
  )
    .then((response) => response.json())
    .then((response) => console.log(response))
    .catch((err) => console.error(err));
}

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    await b2AuthorizeAccount(env).then(async (authAccount: any) => {
      const downloadAuthorization = await b2GetDownloadAuthorization({
        ...env,
        ...authAccount,
      });
      await uploadWorker({
        ...env,
        ...(downloadAuthorization as { authorizationToken: string }),
      });
    });
  },
};
