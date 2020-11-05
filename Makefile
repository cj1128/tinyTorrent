flags := -c tsconfig.json --allow-read --allow-net --allow-write

dev:
	deno run --no-check $(flags) src/main.ts tmp/test.torrent -- --debug
.PHONY: dev

run:
	deno run $(flags) src/main.ts tmp/test.torrent
.PHONY: dev

test:
	deno test --no-check
.PHONY: test

lint:
	deno lint --unstable
.PHONY: lint