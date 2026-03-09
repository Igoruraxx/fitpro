async function test() {
  const response = await fetch("http://localhost:3003/api/trpc/test", {
    headers: { 'Content-Type': 'application/json' }
  });
  console.log("Status:", response.status);
  console.log("Content-Type:", response.headers.get('content-type'));
  console.log("Body:", await response.text());
}
test();
