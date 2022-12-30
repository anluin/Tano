run: bin/libsqlite3_aarch64.dylib
	DENO_SQLITE_PATH=./bin/libsqlite3_aarch64.dylib deno run --check -A cli/main.ts samples/hello_world/

bin/libsqlite3_aarch64.dylib:
	wget -O $@ https://github.com/denodrivers/sqlite3/releases/download/0.6.1/libsqlite3_aarch64.dylib
