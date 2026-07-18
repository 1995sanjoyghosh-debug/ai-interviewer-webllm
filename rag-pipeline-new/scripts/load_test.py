import argparse
import asyncio
import statistics
import time

import httpx


async def send_query(client, url, doc_id, question, semaphore):
    async with semaphore:
        start = time.perf_counter()
        try:
            response = await client.post(
                url,
                json={"doc_id": doc_id, "question": question},
                timeout=30,
            )
            elapsed = time.perf_counter() - start
            data = response.json()
            success = response.status_code == 200
            tokens = data.get("usage", {}).get("completion_tokens", 0)
            return {"latency": elapsed, "success": success, "tokens": tokens}
        except Exception:
            return {"latency": time.perf_counter() - start, "success": False, "tokens": 0}


async def run_load_test(url, doc_id, question, requests, concurrency):
    semaphore = asyncio.Semaphore(concurrency)
    async with httpx.AsyncClient() as client:
        tasks = [
            send_query(client, url, doc_id, question, semaphore)
            for _ in range(requests)
        ]
        return await asyncio.gather(*tasks)


def summarize(results):
    latencies = [r["latency"] for r in results]
    errors = sum(1 for r in results if not r["success"])
    tokens = [r["tokens"] for r in results if r["success"]]
    duration = sum(latencies) if latencies else 0.0
    print(f"requests: {len(results)}")
    print(f"success rate: {100 * (1 - errors / len(results)):.2f}%")
    print(f"errors: {errors}")
    if duration > 0:
        print(f"throughput req/sec: {len(results)/duration:.2f}")
    for percentile in [50, 95, 99]:
        if len(latencies) >= 100:
            value = statistics.quantiles(latencies, n=100)[percentile - 1]
        else:
            value = sorted(latencies)[min(percentile - 1, len(latencies) - 1)]
        print(f"p{percentile} latency: {value:.3f}s")
    if tokens:
        print(f"avg tokens: {statistics.mean(tokens):.1f}")
        print(f"total tokens: {sum(tokens)}")


def main():
    parser = argparse.ArgumentParser(description="Load test the RAG query endpoint.")
    parser.add_argument("--url", required=True, help="Full query endpoint URL")
    parser.add_argument("--doc-id", required=True, help="Document ID to query")
    parser.add_argument("--question", default="Summarize the document.", help="Query text")
    parser.add_argument("--requests", type=int, default=50, help="Number of requests")
    parser.add_argument("--concurrency", type=int, default=5, help="Concurrent requests")
    args = parser.parse_args()

    results = asyncio.run(
        run_load_test(args.url, args.doc_id, args.question, args.requests, args.concurrency)
    )
    summarize(results)


if __name__ == "__main__":
    main()
