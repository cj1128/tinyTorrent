flags := --allow-read --allow-net

run:
	deno run --no-check $(flags) src/main.ts tmp/test.torrent
.PHONY: dev

run-check:
	deno run $(flags) src/main.ts tmp/test.torrent
.PHONY: dev

test:
	deno test --no-check
.PHONY: test
