install:
	deno check cli/main.ts && deno install --check --allow-env --allow-run --allow-net --allow-read --allow-write -f -n tano cli/main.ts

test:
	@deno run --check --allow-read --allow-env --allow-run --allow-write cli/main.ts sample
