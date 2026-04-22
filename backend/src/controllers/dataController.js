const { Readable } = require("stream");
const csvParser = require("csv-parser");
const xlsx = require("xlsx");

const SensorData = require("../models/SensorData");
const asyncHandler = require("../utils/asyncHandler");
const { runtime, newId } = require("../state/runtime");

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseTimestamp(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeRow(row) {
  const machineId = String(row.machineId ?? row.machine_id ?? row.machine ?? "").trim();
  const temperature = parseNumber(row.temperature);
  const vibration = parseNumber(row.vibration);
  const pressure = parseNumber(row.pressure);
  const timestamp = parseTimestamp(row.timestamp ?? row.time ?? row.datetime ?? row.date);

  if (!machineId) return { error: "machineId is required" };
  if (temperature === null) return { error: "temperature must be a number" };
  if (vibration === null) return { error: "vibration must be a number" };
  if (pressure === null) return { error: "pressure must be a number" };
  if (!timestamp) return { error: "timestamp is invalid" };

  return {
    doc: {
      machineId,
      temperature,
      vibration,
      pressure,
      timestamp
    }
  };
}

async function parseCsvBuffer(buffer) {
  const rows = [];
  const stream = Readable.from(buffer);
  await new Promise((resolve, reject) => {
    stream
      .pipe(csvParser())
      .on("data", (data) => rows.push(data))
      .on("end", resolve)
      .on("error", reject);
  });
  return rows;
}

function parseXlsxBuffer(buffer) {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet, { defval: "" });
}

const uploadSensorData = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "file is required" });
  }

  const { originalname, buffer } = req.file;
  const lower = String(originalname || "").toLowerCase();
  const isCsv = lower.endsWith(".csv");
  const isXlsx = lower.endsWith(".xlsx") || lower.endsWith(".xls");
  if (!isCsv && !isXlsx) {
    return res.status(400).json({ message: "Only .csv or .xlsx files are supported" });
  }

  const rows = isCsv ? await parseCsvBuffer(buffer) : parseXlsxBuffer(buffer);
  if (!rows || rows.length === 0) {
    return res.status(400).json({ message: "No rows found in file" });
  }

  const valid = [];
  const rejected = [];

  rows.forEach((row, index) => {
    const { doc, error } = normalizeRow(row);
    if (error) {
      rejected.push({ row: index + 1, error });
      return;
    }
    valid.push(doc);
  });

  if (valid.length === 0) {
    return res.status(400).json({
      message: "All rows were rejected",
      rejectedCount: rejected.length,
      rejected: rejected.slice(0, 15)
    });
  }

  const useDb = runtime.dbReady && !runtime.memoryMode;
  let insertedCount = 0;
  if (!useDb) {
    const nowIso = new Date().toISOString();
    valid.forEach((doc) => {
      runtime.sensorData.push({
        _id: newId(),
        ...doc,
        createdAt: nowIso,
        updatedAt: nowIso
      });
    });
    insertedCount = valid.length;
  } else {
    try {
      const created = await SensorData.insertMany(valid, { ordered: false });
      insertedCount = created.length;
    } catch (err) {
      // insertMany may throw even when ordered:false and partial inserts happened.
      if (Array.isArray(err.insertedDocs)) {
        insertedCount = err.insertedDocs.length;
      } else {
        throw err;
      }
    }
  }

  return res.status(201).json({
    insertedCount,
    rejectedCount: rejected.length,
    rejected: rejected.slice(0, 15)
  });
});

const listSensorData = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const machineId = String(req.query.machineId || "").trim();

  const useDb = runtime.dbReady && !runtime.memoryMode;
  if (!useDb) {
    const source = machineId
      ? runtime.sensorData.filter((d) => String(d.machineId) === machineId)
      : runtime.sensorData;

    const sorted = [...source].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const total = sorted.length;
    const pages = Math.max(Math.ceil(total / limit), 1);
    const safePage = Math.min(page, pages);
    const start = (safePage - 1) * limit;
    const items = sorted.slice(start, start + limit);
    return res.json({ items, total, page: safePage, limit, pages });
  }

  const query = machineId ? { machineId } : {};
  const total = await SensorData.countDocuments(query);
  const pages = Math.max(Math.ceil(total / limit), 1);
  const safePage = Math.min(page, pages);
  const items = await SensorData.find(query)
    .sort({ timestamp: -1 })
    .skip((safePage - 1) * limit)
    .limit(limit);
  return res.json({ items, total, page: safePage, limit, pages });
});

const deleteSensorData = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const useDb = runtime.dbReady && !runtime.memoryMode;

  if (!useDb) {
    const index = runtime.sensorData.findIndex((d) => d._id === id);
    if (index === -1) {
      return res.status(404).json({ message: "Record not found" });
    }
    runtime.sensorData.splice(index, 1);
    return res.json({ ok: true });
  }

  const deleted = await SensorData.findByIdAndDelete(id);
  if (!deleted) {
    return res.status(404).json({ message: "Record not found" });
  }
  return res.json({ ok: true });
});

module.exports = { uploadSensorData, listSensorData, deleteSensorData };
