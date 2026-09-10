import { MongoClient, MongoClientOptions } from "mongodb";
import { promises as dnsPromises } from "dns";

const uri = process.env.MONGODB_URI;
const isPlaceholder = !uri || uri.includes("<username>") || uri.includes("<password>");

// SRV Resolution: On Windows, MongoDB driver internal SRV resolution fails
// because dns.setServers() doesn't take effect before the driver resolves.
// We pre-resolve SRV records using Google DNS and build a direct connection string.

async function resolveSRV(srvUri: string): Promise<string> {
  if (!srvUri.startsWith("mongodb+srv://")) return srvUri;

  try {
    dnsPromises.setServers(["8.8.8.8", "1.1.1.1"]);

    const uriBody = srvUri.replace("mongodb+srv://", "");
    const atIndex = uriBody.indexOf("@");
    const credentials = atIndex >= 0 ? uriBody.substring(0, atIndex) : "";
    const afterAt = atIndex >= 0 ? uriBody.substring(atIndex + 1) : uriBody;

    const slashIndex = afterAt.indexOf("/");
    const hostPart = slashIndex >= 0 ? afterAt.substring(0, slashIndex) : afterAt;
    const pathAndQuery = slashIndex >= 0 ? afterAt.substring(slashIndex) : "/";

    const queryIndex = pathAndQuery.indexOf("?");
    const dbPath = queryIndex >= 0 ? pathAndQuery.substring(0, queryIndex) : pathAndQuery;
    const existingQuery = queryIndex >= 0 ? pathAndQuery.substring(queryIndex + 1) : "";

    const srvHost = "_mongodb._tcp." + hostPart;

    const [srvRecords, txtRecords] = await Promise.all([
      dnsPromises.resolveSrv(srvHost).catch(() => []),
      dnsPromises.resolveTxt(hostPart).catch(() => []),
    ]);

    if (srvRecords.length === 0) {
      console.warn("[MongoDB] No SRV records found for", srvHost);
      return srvUri;
    }

    const hosts = srvRecords.map(function(r) { return r.name + ":" + r.port; }).join(",");

    let txtParams = "";
    if (txtRecords.length > 0 && txtRecords[0].length > 0) {
      txtParams = txtRecords[0][0];
    }

    const mergedMap = new Map<string, string>();
    if (txtParams) {
      txtParams.split("&").forEach(function(p) {
        var eq = p.indexOf("=");
        if (eq > 0) mergedMap.set(p.substring(0, eq), p.substring(eq + 1));
      });
    }
    if (existingQuery) {
      existingQuery.split("&").forEach(function(p) {
        var eq = p.indexOf("=");
        if (eq > 0) mergedMap.set(p.substring(0, eq), p.substring(eq + 1));
        else if (p) mergedMap.set(p, "");
      });
    }

    const mergedParams = Array.from(mergedMap.entries())
      .map(function(e) { return e[0] + "=" + e[1]; })
      .join("&");

    var directUri = "mongodb://" + credentials + "@" + hosts + "/" + dbPath;
    if (mergedParams) directUri += "?" + mergedParams;

    console.log("[MongoDB] Resolved SRV to", srvRecords.length, "direct hosts");
    return directUri;
  } catch (err: any) {
    console.warn("[MongoDB] SRV resolution failed, using original URI:", err.message);
    return srvUri;
  }
}

const clientOptions: MongoClientOptions = {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
  tls: true,
  retryWrites: true,
  w: "majority" as any,
};

async function connectWithRetry(retries = 2): Promise<MongoClient | null> {
  if (!uri || isPlaceholder) {
    console.warn("[MongoDB] No valid MONGODB_URI configured.");
    return null;
  }

  const resolvedUri = await resolveSRV(uri);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const client = new MongoClient(resolvedUri, clientOptions);
      await client.connect();
      console.log("[MongoDB] Connected successfully (attempt " + (attempt + 1) + ")");
      return client;
    } catch (err: any) {
      console.warn("[MongoDB] Connection attempt " + (attempt + 1) + " failed:", err.message);
      if (attempt < retries) {
        await new Promise(function(r) { setTimeout(r, 1000 * (attempt + 1)); });
      }
    }
  }
  console.error("[MongoDB] All connection attempts failed.");
  console.error("[MongoDB] If this is 'tlsv1 alert internal error', your IP may not be whitelisted in MongoDB Atlas.");
  console.error("[MongoDB] Go to cloud.mongodb.com → Network Access → Add IP Address.");
  return null;
}

function getMongoClient(): Promise<MongoClient | null> {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient | null>;
  };

  if (globalWithMongo._mongoClientPromise) {
    return globalWithMongo._mongoClientPromise;
  }

  const promise = connectWithRetry();
  globalWithMongo._mongoClientPromise = promise;

  promise.catch(function() {
    globalWithMongo._mongoClientPromise = undefined;
  });

  return promise;
}

let clientPromise: Promise<MongoClient | null> | undefined;
if (uri && !isPlaceholder) {
  clientPromise = getMongoClient();
}

export { clientPromise };
export default clientPromise;
export { getMongoClient };
