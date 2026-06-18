const { getSupabase } = require('./supabase');

function normalizeFieldConfig(fields) {
    return Object.entries(fields).reduce((acc, [property, config]) => {
        acc[property] = typeof config === 'string' ? { column: config } : config;
        return acc;
    }, {});
}

function createSupabaseModel({ table, fields, primaryKey, conflictColumns, defaults = {} }) {
    const fieldConfig = normalizeFieldConfig(fields);
    const propertyByColumn = Object.entries(fieldConfig).reduce((acc, [property, config]) => {
        acc[config.column] = property;
        return acc;
    }, {});

    const primaryProperty = propertyByColumn[primaryKey];
    const upsertConflict = (conflictColumns || [primaryKey]).join(',');

    function toDbRow(data = {}) {
        const row = {};

        for (const [property, config] of Object.entries(fieldConfig)) {
            if (!Object.prototype.hasOwnProperty.call(data, property)) continue;
            const value = data[property];
            row[config.column] = config.toDb ? config.toDb(value) : value;
        }

        return row;
    }

    function applyDefaults(data = {}) {
        const next = { ...data };

        for (const [property, defaultValue] of Object.entries(defaults)) {
            if (next[property] !== undefined && next[property] !== null) continue;
            next[property] = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
        }

        return next;
    }

    function fromDbRow(row) {
        if (!row) return null;

        const data = {};

        for (const [column, value] of Object.entries(row)) {
            const property = propertyByColumn[column];
            if (!property) continue;
            const config = fieldConfig[property];
            data[property] = config.fromDb ? config.fromDb(value) : value;
        }

        const model = new Model(data);
        model._exists = true;
        model._primaryValue = primaryProperty ? model[primaryProperty] : row[primaryKey];
        model._saveFilter = Object.fromEntries((conflictColumns || [primaryKey]).map((column) => [column, row[column]]));
        return model;
    }

    function applyFilter(query, filter = {}) {
        let nextQuery = query;

        for (const [property, value] of Object.entries(filter)) {
            const config = fieldConfig[property];
            if (!config) continue;
            nextQuery = nextQuery.eq(config.column, config.toDb ? config.toDb(value) : value);
        }

        return nextQuery;
    }

    async function run(query) {
        const { data, error, count } = await query;
        if (error) throw error;
        return { data, count };
    }

    class Model {
        constructor(data = {}) {
            Object.assign(this, applyDefaults(data));
            this._exists = false;
            this._primaryValue = primaryProperty ? this[primaryProperty] : undefined;
            this._saveFilter = null;
        }

        static async findOne(filter = {}) {
            const query = applyFilter(getSupabase().from(table).select('*'), filter).limit(1).maybeSingle();
            const { data } = await run(query);
            return fromDbRow(data);
        }

        static async find(filter = {}) {
            const query = applyFilter(getSupabase().from(table).select('*'), filter);
            const { data } = await run(query);
            return (data || []).map(fromDbRow);
        }

        static async create(data = {}) {
            const row = toDbRow(applyDefaults(data));
            const query = getSupabase().from(table).insert(row).select('*').single();
            const result = await run(query);
            return fromDbRow(result.data);
        }

        static async findOneAndUpdate(filter = {}, update = {}, options = {}) {
            if (options.upsert) {
                const row = toDbRow(applyDefaults({ ...filter, ...update }));
                const query = getSupabase()
                    .from(table)
                    .upsert(row, { onConflict: upsertConflict })
                    .select('*')
                    .single();
                const result = await run(query);
                return fromDbRow(result.data);
            }

            const query = applyFilter(getSupabase().from(table).update(toDbRow(update)).select('*'), filter)
                .limit(1)
                .maybeSingle();
            const result = await run(query);
            return fromDbRow(result.data);
        }

        static async findOneAndDelete(filter = {}) {
            const existing = await this.findOne(filter);
            if (!existing) return null;

            const query = applyFilter(getSupabase().from(table).delete(), filter);
            await run(query);
            return existing;
        }

        static async deleteOne(filter = {}) {
            const query = applyFilter(getSupabase().from(table).delete().select('*'), filter);
            const { data } = await run(query);
            return { deletedCount: data ? data.length : 0 };
        }

        async save() {
            const payload = {};

            for (const property of Object.keys(fieldConfig)) {
                if (Object.prototype.hasOwnProperty.call(this, property)) {
                    payload[property] = this[property];
                }
            }

            const row = toDbRow(applyDefaults(payload));
            let result;

            if (this._exists && this._primaryValue !== undefined) {
                let query = getSupabase()
                    .from(table)
                    .update(row)
                    .select('*');

                const saveFilter = this._saveFilter || { [primaryKey]: this._primaryValue };
                for (const [column, value] of Object.entries(saveFilter)) {
                    query = query.eq(column, value);
                }

                query = query.single();
                result = await run(query);
            } else {
                const query = getSupabase()
                    .from(table)
                    .upsert(row, { onConflict: upsertConflict })
                    .select('*')
                    .single();
                result = await run(query);
            }

            const saved = fromDbRow(result.data);
            Object.assign(this, saved);
            this._exists = true;
            this._primaryValue = saved._primaryValue;
            return this;
        }

        toJSON() {
            const data = {};

            for (const property of Object.keys(fieldConfig)) {
                if (Object.prototype.hasOwnProperty.call(this, property)) {
                    data[property] = this[property];
                }
            }

            return data;
        }
    }

    return Model;
}

function dateToDb(value) {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : value;
}

function dateFromDb(value) {
    return value ? new Date(value) : null;
}

function stringArrayToDb(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function stringArrayFromDb(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

module.exports = {
    createSupabaseModel,
    dateToDb,
    dateFromDb,
    stringArrayToDb,
    stringArrayFromDb,
};
