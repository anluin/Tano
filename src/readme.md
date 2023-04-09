# Tano

A fullstack framework for Deno for easily creating (progressive) web apps.

## Installation

```sh
deno install --force --name tano -A https://deno.land/x/tano@0.0.20/cli/main.ts
```

## Commands

All Commands are meant to be executed in the project root aka "Workspace". <br/>
Alternatively, this can be set with the option `--workspace=<project-root>`.<br/>

### Setup

Tano based applications require a certain project structure to function.<br/>
This structure can be created (with example code for a simple "Hello, world!" application) using the `tano setup`
command.

```sh
tano setup [--workspace=./]
```

### Build

A build step is required to serve Tano based applications, which can be executed with the `tano build` command.

```sh
tano build [--workspace=./] [--minify=true]
```

### Serve

To start a Tano based application, so that it can be accessed via http://localhost:4500, the `tano serve` command is
recommended. <br/>
This internally executes the `tano build` command and then starts the application's backend via `deno run` with the
necessary options.

```sh
tano serve [--workspace=./] [--minify=true] [--port=4500]
```
