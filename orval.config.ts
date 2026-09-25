import path from 'node:path';

import { defineConfig } from 'orval';

const generatedDirectory = process.env.ORVAL_OUTPUT_DIR ?? './src/lib/api/generated';

export default defineConfig({
  kepotret: {
    input: {
      target: './contracts/openapi/Kepotret_OpenAPI_v1_Baseline.yaml',
    },
    output: {
      target: path.join(generatedDirectory, 'index.ts'),
      client: 'fetch',
      mode: 'tags-split',
      clean: true,
      indexFiles: false,
      override: {
        requestOptions: {
          credentials: 'include',
        },
      },
    },
  },
});
