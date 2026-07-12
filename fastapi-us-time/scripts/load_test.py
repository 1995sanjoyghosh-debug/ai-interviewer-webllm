import argparse
import asyncio
import statistics
import time

import httpx


async def request_once(client: httpx.AsyncClient, url: str) -> float:
    started = time.perf_counter()
    response = await client.get(url)
    response.raise_for_status()
    return (time.perf_counter() - started) * 1000


async def run_load_test(url: str, requests: int, concurrency: int) -> None:
    latencies: list[float] = []
    failures = 0
    started = time.perf_counter()

    limits = httpx.Limits(max_connections=concurrency, max_keepalive_connections=concurrency)
    timeout = httpx.Timeout(10.0)

    async with httpx.AsyncClient(limits=limits, timeout=timeout) as client:
        semaphore = asyncio.Semaphore(concurrency)

        async def bounded_request() -> None:
            nonlocal failures
            async with semaphore:
                try:
                    latencies.append(await request_once(client, url))
                except httpx.HTTPError:
                    failures += 1

        await asyncio.gather(*(bounded_request() for _ in range(requests)))

    elapsed = time.perf_counter() - started
    successful = len(latencies)
    rps = successful / elapsed if elapsed else 0

    if latencies:
        latencies_sorted = sorted(latencies)
        p95_index = max(0, int(successful * 0.95) - 1)
        p99_index = max(0, int(successful * 0.99) - 1)

        print(f"requests: {requests}")
        print(f"successful: {successful}")
        print(f"failed: {failures}")
        print(f"elapsed_seconds: {elapsed:.2f}")
        print(f"requests_per_second: {rps:.2f}")
        print(f"latency_avg_ms: {statistics.mean(latencies):.2f}")
        print(f"latency_p95_ms: {latencies_sorted[p95_index]:.2f}")
        print(f"latency_p99_ms: {latencies_sorted[p99_index]:.2f}")
    else:
        print("No successful requests.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Simple async load test for the US time API.")
    parser.add_argument("--url", default="http://127.0.0.1:8000/time/us")
    parser.add_argument("--requests", type=int, default=1000)
    parser.add_argument("--concurrency", type=int, default=50)
    args = parser.parse_args()

    asyncio.run(run_load_test(args.url, args.requests, args.concurrency))


if __name__ == "__main__":
    main()
