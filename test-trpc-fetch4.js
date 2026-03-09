async function test() {
  const { createTRPCClient, httpBatchLink } = await import('@trpc/client');
  const superjson = (await import('superjson')).default;
  const trpcClient = createTRPCClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:3004/api/trpc',
        transformer: superjson,
        fetch(input, init) {
          return globalThis.fetch(input, init).then(response => {
            const contentType = response.headers.get("content-type") ?? "";
            if (!response.ok && !contentType.includes("application/json")) {
              throw new Error("Erro interno do servidor. Tente novamente mais tarde.");
            }
            return response;
          });
        }
      })
    ]
  });
  try {
    await trpcClient.test.query();
  } catch (err) {
    console.log("TRPC Error Message:", err.message);
  }
}
test();
