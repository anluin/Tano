run:
	@deno run --check --allow-read --allow-write --allow-run --allow-env src/cli/main.ts examples/hello_world
	@cd examples/hello_world && deno run --allow-net --allow-read src/main.ts


install:
	@deno install --force --allow-read --allow-write --allow-env --allow-run --name tano src/cli/main.ts
