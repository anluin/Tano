import { Database } from "https://deno.land/x/sqlite3@0.6.1/src/database.ts";
import { BindValue, RestBindParameters } from "https://deno.land/x/sqlite3@0.6.1/src/statement.ts";


export type DefaultFnArgs = {
    tableName: string,
};

export type DefaultFn<T = unknown> = (args: DefaultFnArgs) => T;

export type ColumnDescriptorBase<AutoIncrement extends boolean, Nullable extends boolean> = {
    unique?: boolean,
    primaryKey?: boolean | {
        autoIncrement?: AutoIncrement,
    },
    nullable?: Nullable,
    references?: {
        table: string,
        column?: string,
    },
};

export type IntegerColumnDescriptor<AutoIncrement extends boolean, Nullable extends boolean, Default extends number> =
    ColumnDescriptorBase<AutoIncrement, Nullable> & {
    type: "integer",
    default?: Default | DefaultFn<Default>,
};

export type TextColumnDescriptor<AutoIncrement extends boolean, Nullable extends boolean, Default extends string> =
    ColumnDescriptorBase<AutoIncrement, Nullable> & {
    type: "text",
    default?: Default | DefaultFn<Default>,
};

export type Timestamp = "CURRENT_TIMESTAMP" | Date;

export type TimestampColumnDescriptor<AutoIncrement extends boolean, Nullable extends boolean, Default extends Timestamp> =
    ColumnDescriptorBase<AutoIncrement, Nullable> & {
    type: "timestamp",
    default?: Default | DefaultFn<Default>,
    updateOnChange?: boolean,
};

export type ColumnDescriptor<AutoIncrement extends boolean = boolean, Nullable extends boolean = boolean, Default = unknown> =
    IntegerColumnDescriptor<AutoIncrement, Nullable, Default extends number ? Default : number> |
    TextColumnDescriptor<AutoIncrement, Nullable, Default extends string ? Default : string> |
    TimestampColumnDescriptor<AutoIncrement, Nullable, Default extends Timestamp ? Default : Timestamp>;


export type ColumnType<ColumnDescriptor> =
    ColumnDescriptor extends TextColumnDescriptor<boolean, boolean, string> ? string :
        ColumnDescriptor extends IntegerColumnDescriptor<boolean, boolean, number> ? number :
            ColumnDescriptor extends TimestampColumnDescriptor<boolean, boolean, Timestamp> ? Date : never;

export type HasDefaultColumns<TableColumns> =
    { [ColumnName in keyof TableColumns as Omit<TableColumns[ColumnName], "default"> extends TableColumns[ColumnName] ? never : ColumnName]: TableColumns[ColumnName] }

export type NullableColumns<TableColumns> =
    { [ColumnName in keyof TableColumns as TableColumns[ColumnName] extends { nullable: true } ? ColumnName : never]: TableColumns[ColumnName] }

export type AutoIncrementalColumns<TableColumns> =
    { [ColumnName in keyof TableColumns as TableColumns[ColumnName] extends { primaryKey: { autoIncrement: true } } ? ColumnName : never]: TableColumns[ColumnName] }

export type OptionalInsertDataColumns<TableColumns> =
    NullableColumns<TableColumns> &
    HasDefaultColumns<TableColumns> &
    AutoIncrementalColumns<TableColumns>;

export type InsertData<TableColumns> =
    { [ColumnName in keyof Pick<TableColumns, keyof OptionalInsertDataColumns<TableColumns>>]+?: ColumnType<TableColumns[ColumnName]> } &
    { [ColumnName in keyof Omit<TableColumns, keyof OptionalInsertDataColumns<TableColumns>>]-?: ColumnType<TableColumns[ColumnName]> };

export type WhereData<TableColumns> =
    { [ColumnName in keyof TableColumns]?: ColumnType<TableColumns[ColumnName]> };

export type Entry<Columns, ColumnNames extends Array<keyof Columns>> =
    { [ColumnName in keyof Pick<Columns, keyof NullableColumns<Columns>>]+?: ColumnType<Columns[ColumnName]> } &
    { [ColumnName in keyof Omit<Columns, keyof NullableColumns<Columns>>]-?: ColumnType<Columns[ColumnName]> };

export type SelectResults<Columns, ColumnNames extends Array<keyof Columns>> =
    Entry<Columns, ColumnNames>[];

export type Schema = Record<string, ColumnDescriptor>;

export const defaultColumns = {
    id: { type: "integer", primaryKey: { autoIncrement: true } },
    createdAt: { type: "timestamp", default: "CURRENT_TIMESTAMP" },
    updatedAt: { type: "timestamp", default: "CURRENT_TIMESTAMP" },
    deletedAt: { type: "timestamp", nullable: true },
} as const;

export type DefaultColumns = typeof defaultColumns;

export const js2sql = (value: unknown): string | number => {
    if (typeof value === "string" || typeof value === "number") {
        return value;
    }

    if (value instanceof Date) {
        const regexp = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z/;

        return (
            value
                .toISOString()
                .replace(regexp, `$1-$2-$3 $4:$5:$6`)
        );
    }

    throw new Error();
};

export const sql2date = (value: string) => {
    const regexp = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/gm;

    return new Date(
        value
            .replace(regexp, `$1-$2-$3T$4:$5:$6.000Z`),
    );
};

export const diffObject = (a: Record<string, unknown>, b: Record<string, unknown>) => {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    const keys = aKeys.filter(e => bKeys.includes(e));
    const removedKeys = aKeys.filter(e => !(a[e] instanceof Function) && !bKeys.includes(e));
    const newKeys = bKeys.filter(e => !(b[e] instanceof Function) && !aKeys.includes(e));
    const changes: Record<string, unknown> = {};

    for (const key of keys) {
        if (a[key] === b[key] || a[key] instanceof Function || b[key] instanceof Function) {
            continue;
        }

        if (typeof a[key] === "object" && a[key] !== null && typeof b[key] === "object" && b[key] !== null) {
            const result = diffObject(a[key] as typeof a, b[key] as typeof b);

            if (Object.keys(result).length > 0) {
                changes[key] = result;
            }

            continue;
        }

        changes[key] = b[key];
    }

    return {
        ...removedKeys.length > 0 ? { removedKeys } : undefined,
        ...newKeys.length > 0 ? { newKeys } : undefined,
        ...Object.keys(changes).length > 0 ? { changes } : undefined,
    };
};

export const compareObject = (a: Record<string, unknown>, b: Record<string, unknown>) => {
    return Object.keys(diffObject(a, b)).length === 0;
};

export class Migration<FromSchema extends Schema, ToSchema extends Schema> {
    readonly fromSchema: FromSchema;
    readonly toSchema: ToSchema;
    readonly migrate: (fromTable: Table<FromSchema>, toTable: Table<ToSchema>) => void | Promise<void>;

    constructor(fromSchema: FromSchema, toSchema: ToSchema, callback: (fromTable: Table<FromSchema>, toTable: Table<ToSchema>) => void) {
        this.fromSchema = fromSchema;
        this.toSchema = toSchema;
        this.migrate = callback;
    }

    static findPath<FromSchema extends Schema, ToSchema extends Schema>(from: Schema, to: Schema, migrations: Migration<FromSchema, ToSchema>[]): Migration<FromSchema, ToSchema>[] {
        for (const migration of migrations) {
            if (compareObject(to, migration.toSchema)) {
                if (compareObject(from, migration.fromSchema)) {
                    return [ migration ];
                }

                return [ ...Migration.findPath(from, migration.fromSchema, migrations), migration ];
            }
        }

        return [];
    }
}

export class Table<Columns extends Schema> {
    name: string;
    readonly columns: DefaultColumns & Columns;

    constructor(name: string, columns: Columns) {
        this.name = name;
        this.columns = {
            ...defaultColumns,
            ...columns,
        };
    }

    get schema() {
        return this.columns;
    }

    async create<FromSchema extends Schema, ToSchema extends Schema>(options: { migrations?: Migration<FromSchema, ToSchema>[], dropOnSchemeMismatch?: boolean } = {}) {
        const [ schema ] = database.prepare(`
            SELECT columns
            FROM ormlite_schema
            WHERE name IS ?
            LIMIT 1
        `).all<{ columns: string }>(this.name);

        if (schema) {
            const { migrations, dropOnSchemeMismatch } = options;

            const { columns } = schema;
            const structure = JSON.parse(columns);
            const diff = diffObject(structure, this.columns);

            if (Object.keys(diff).length > 0) {
                if (migrations?.length) {
                    const migrationPath = Migration.findPath(structure, this.columns, migrations);
                    const firstSchema = migrationPath.at(0)?.fromSchema;
                    const lastSchema = migrationPath.at(-1)?.toSchema;

                    if (firstSchema && lastSchema) {
                        let tempTable = new Table<Schema>(this.name, firstSchema);

                        try {
                            for (const migration of migrationPath) {
                                const toTable = new Table<Schema>(crypto.randomUUID(), migration.toSchema);

                                try {
                                    await toTable.create();
                                    await (
                                        (migration as unknown as Migration<Schema, Schema>)
                                            .migrate(tempTable, toTable)
                                    );
                                    await tempTable.drop();
                                    tempTable = toTable;
                                } catch (error) {
                                    await toTable.drop();
                                    throw error;
                                }
                            }
                        } catch (error) {
                            await tempTable.drop();
                            throw error;
                        }

                        await this.drop();
                        await tempTable.rename(this.name);

                        database.exec(`
                            UPDATE ormlite_schema
                            SET columns = ?
                            WHERE name = 'users'
                        `, JSON.stringify(this.columns));

                        return;
                    }
                }

                if (dropOnSchemeMismatch) {
                    await this.drop();
                    await this.create(options);
                } else {
                    throw new Error("schema mismatch");
                }
            }
        } else {
            let sql = `CREATE TABLE "${this.name}"
                       ( `;
            let firstColumn = true;

            for (const columnName in this.columns) {
                const columnDescriptor: ColumnDescriptor<boolean, boolean, Timestamp> = this.columns[columnName];
                const columnType = (<Record<string, string>>{
                    "text": "TEXT",
                    "integer": "INTEGER",
                })[columnDescriptor.type];

                if (firstColumn) {
                    firstColumn = false;
                } else {
                    sql += ",";
                }

                sql += `"${columnName}" ${columnType} `;

                if (columnDescriptor.primaryKey) {
                    sql += "PRIMARY KEY ";

                    if (
                        typeof columnDescriptor.primaryKey !== "boolean" &&
                        columnDescriptor.primaryKey?.autoIncrement
                    ) {
                        sql += "AUTOINCREMENT ";
                    }
                }

                if (columnDescriptor.unique) {
                    sql += "UNIQUE ";
                }

                if (!columnDescriptor.nullable) {
                    sql += "NOT NULL ";
                }

                if (columnDescriptor.references) {
                    const { table, column } = columnDescriptor.references;

                    sql += `REFERENCES "${table}" `;

                    if (column) {
                        sql += `(${column})`;
                    }
                }

                if ("default" in columnDescriptor && columnDescriptor.default) {
                    if (!(columnDescriptor.default instanceof Function)) {
                        const value = (
                            columnDescriptor.default === "CURRENT_TIMESTAMP"
                                ? "CURRENT_TIMESTAMP"
                                : `'${js2sql(columnDescriptor.default)}'`
                        );

                        sql += `DEFAULT ${value}`;
                    }
                }
            }

            sql += ")";

            database.exec(sql);

            for (const columnName in this.columns) {
                const columnDescriptor = this.columns[columnName];

                if (columnDescriptor.type === "timestamp" && columnDescriptor.updateOnChange) {
                    if ("id" in this.columns) {
                        database.exec(`
                                CREATE TRIGGER IF NOT EXISTS "update_${columnName}_on_${this.name}"
                                    AFTER
                                        UPDATE
                                    On "${this.name}"
                                BEGIN
                                    UPDATE "${this.name}"
                                    SET "${columnName}" = CURRENT_TIMESTAMP
                                    WHERE id = NEW.id;
                                END;
                            `);
                    } else {
                        throw new Error();
                    }
                }
            }

            database.exec(`
                INSERT INTO ormlite_schema (name, columns)
                VALUES (?, ?);
            `, [ this.name, JSON.stringify(this.columns) ]);
        }
    }

    async rename(name: string) {
        database.exec(`
            ALTER TABLE "${this.name}"
                RENAME TO "${name}";

            UPDATE ormlite_schema
            SET name = '${name}'
            WHERE name = '${this.name}';
        `);

        this.name = name;
    }

    async drop() {
        database.exec(`
            DROP TABLE IF EXISTS "${this.name}";

            DELETE
            FROM ormlite_schema
            WHERE name = "${this.name}";
        `);
    }

    async findOrInsert<Where extends WhereData<DefaultColumns & Columns>>(where: Where, fallback: InsertData<Columns> | ((where: Where) => InsertData<Columns> | Promise<InsertData<Columns>>)) {
        const [ entry ] = await (
            this.select("*")
                .limit(1)
                .where(where)
                .fetch()
        );

        if (entry) {
            return entry;
        } else {
            const id: number = await (
                this.insert(
                    fallback instanceof Function
                        ? await fallback(where)
                        : fallback
                )
            );

            const [ entry ] = await (
                this.select("*")
                    .limit(1)
                    .where({ id } as Where)
                    .fetch()
            );

            return entry;
        }
    }

    async insert(data: InsertData<Columns>[]): Promise<number[]>;
    async insert(data: InsertData<Columns>): Promise<number>;
    async insert(data: InsertData<Columns> | InsertData<Columns>[]): Promise<number | number[]> {
        if (data instanceof Array) {
            return await Promise.all(data.map(data => this.insert(data)));
        } else {
            let sql = `INSERT INTO "${this.name}" ( `;
            let firstColumn = true;

            let sqlValues = "";
            const sqlParams: RestBindParameters = [];

            for (const columnName in this.columns) {
                const defaultFn = this.columns[columnName]?.default;

                if (defaultFn instanceof Function) {
                    (data as any)[columnName] ??= js2sql(defaultFn({ tableName: this.name }));
                }
            }

            for (const columnName in data) {
                if (columnName in this.columns) {
                    const value = (data as Record<string, BindValue>)[columnName];

                    if (firstColumn) {
                        firstColumn = false;
                    } else {
                        sql += ", ";
                        sqlValues += ", ";
                    }

                    sql += `"${columnName}" `;
                    sqlValues += `? `;
                    sqlParams.push(value);
                }
            }

            sql += `) VALUES ( ${sqlValues})`;

            database
                .prepare(sql)
                .run(sqlParams);

            return database.lastInsertRowId;
        }
    }

    select<ColumnNames extends Array<keyof DefaultColumns | keyof Columns>>(columnNames: ColumnNames | "*") {
        return new Select<Columns, ColumnNames>(this, columnNames);
    }
}

export type SelectMeta<Columns extends Schema> = {
    where?: WhereData<Columns>;
    limit?: number;
    offset?: number;
};

export class Select<Columns extends Schema, ColumnNames extends Array<keyof Columns>> {
    readonly table: Table<Columns>;
    readonly columnNames: ColumnNames | "*"
    readonly meta?: SelectMeta<Columns>;


    constructor(table: Table<Columns>, columnNames: "*" | ColumnNames, meta?: SelectMeta<Columns>) {
        this.table = table;
        this.columnNames = columnNames;
        this.meta = meta;
    }

    where(data: WhereData<DefaultColumns & Columns>) {
        return new Select(this.table, this.columnNames, {
            ...this.meta,
            where: {
                ...this.meta?.where,
                ...data,
            },
        });
    }

    limit(limit: number, offset?: number) {
        return new Select(this.table, this.columnNames, {
            ...this.meta,
            limit,
            offset,
        });
    }

    async fetch() {
        let sql = "SELECT ";

        if (this.columnNames[0] !== "*") {
            let firstColumn = true;

            for (const columnName of this.columnNames as string[]) {
                if (firstColumn) {
                    firstColumn = false;
                } else {
                    sql += ", ";
                }

                sql += `"${this.table.name}"."${columnName}" `;
            }
        } else {
            sql += `"${this.table.name}".* `;
        }

        sql += `FROM "${this.table.name}" `;

        const sqlParams: RestBindParameters = [];

        if (this.meta?.where) {
            let firstColumn = true;

            sql += "WHERE ";

            for (const columnName in this.meta?.where) {
                const value = this.meta?.where[columnName];

                if (firstColumn) {
                    firstColumn = false;
                } else {
                    sql += ", ";
                }

                sql += `"${columnName}" IS ? `;
                sqlParams.push(value);
            }
        }

        if (this.meta?.limit !== undefined) sql += `LIMIT ${this.meta?.limit} `;
        if (this.meta?.offset !== undefined) sql += `OFFSET ${this.meta?.offset} `;

        return (
            database
                .prepare(sql)
                .all(sqlParams)
                .map(entry => {
                    for (const columnName in entry) {
                        const columnDescriptor = this.table.columns[columnName];

                        if (columnDescriptor?.type === "timestamp" && entry[columnName]) {
                            entry[columnName] = sql2date(entry[columnName]);
                        }
                    }

                    return entry;
                })
        ) as SelectResults<Columns, ColumnNames>;
    }
}


await Deno.mkdir(".data", { recursive: true });
export const database = new Database(".data/database.sqlite");

database.exec(`
    CREATE TABLE IF NOT EXISTS ormlite_schema
    (
        name    TEXT REFERENCES sqlite_master (name) UNIQUE NOT NULL,
        columns TEXT                                        NOT NULL
    );

    DELETE
    FROM ormlite_schema
    WHERE name NOT IN (SELECT name
                       FROM sqlite_master
                       WHERE type IS 'table');
`);
