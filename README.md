# **使用 Cloudflare Worker 访问 Backblaze B2 私有桶**

**cw4b2** 采用 Cloudflare Wrangler 工具管理, Wrangler 安装使用教程, 请前往 https://developers.cloudflare.com/workers/

**cw4b2** 将会在 Cloudflare Workers 产生两个 Worker *( 一个用于**生产 Worker** , 另一个为**访问 Worker** )*. 

因为 **Backblaze B2 授权令牌** 最大有效时长为 7 天, 所以我们需要在 wrangler.toml 中配置每隔 7 天 ( 默认是每周一 ) 运行**生产 Worker** 更新 **Backblaze B2 授权令牌** 并上传覆盖 **访问 Worker**

```toml
[triggers]
crons = ["17 4 * * 2"] # 设置每周一凌晨4点17分更新 Backblaze B2 Worker
```

## **本地测试**

使用 npm start 在本地测试

![image](https://user-images.githubusercontent.com/22870150/232201165-18d0941e-53dd-48ac-a62c-02e3a01fc1ca.png)

打开另一个命令行工具, 输入 curl http://localhost:8787/cdn-cgi/mf/scheduledclear

![image](https://user-images.githubusercontent.com/22870150/232201202-a96e3f13-4732-45e3-aec3-18f4773d85ad.png)

*( 请注意: 本地测试仍然会在 Cloudflare Workers 创建有效的 **访问 Worker** )*

## **发布 Worker**

使用 npm run deploy 发布 **cw4b2** 到 Cloudflare Workers , 它将按照 Wrangler 配置文件中的设置运行

## **环境变量配置**

以下数据为私密内容, 不可以泄露, 把数据上传到 secret 中 *( secret 仅在生产中使用, 如需在本地测试, 把 BUCKET_ID=xxxxxx 等全部环境变量加入根目录下的 .dev.vars )*

```javascript
wrangler secret put BUCKET_ID                       // 填写 Backblaze B2 Bucket ID
wrangler secret put BUCKET_NAME                     // 填写 Backblaze B2 Bucket 名称
wrangler secret put BUCKET_AUTHORIZATION            // 填写 Backblaze B2 请求 Headers 的 Authorization 字段, 字段格式 "Basic Base64(keyID:applicationKey)"
wrangler secret put CLOUDFLARE_ACCOUNT_ID           // 填写 Cloudflare Account ID
wrangler secret put CLOUDFLARE_API_TOKEN            // 填写 Cloudflare API Token
```


## **修改自定义配置**

在 src/index.ts 中修改自定义配置, 以下是设置 Backblaze B2 Token 有效时长和 Cloudflare Worker 的名称

```javascript
const validDurationInSeconds = 7 * 24 * 60 * 60;    // 设置授权令牌最长失效时长 7 天
const workerName = "work-cw4b2-01";                 // 设置 Cloudflare Worker 的名称
```
