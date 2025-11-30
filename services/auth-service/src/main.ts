import app from "./app";
import { loadEnv } from "./utils/env";

const env = loadEnv();

app.listen(env.PORT, () => {
  console.log(`Auth service running on port ${env.PORT}`);
});
