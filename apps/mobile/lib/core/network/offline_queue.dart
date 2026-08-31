import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class OfflineQueue {
  Database? _db;

  Future<Database> get database async {
    _db ??= await _initDb();
    return _db!;
  }

  Future<Database> _initDb() async {
    final path = join(await getDatabasesPath(), 'offline_queue.db');
    return openDatabase(path, version: 1, onCreate: (db, version) async {
      await db.execute('''
        CREATE TABLE queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          method TEXT NOT NULL,
          path TEXT NOT NULL,
          body TEXT,
          created_at TEXT NOT NULL
        )
      ''');
      await db.execute('''
        CREATE TABLE cache (
          key TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      ''');
    });
  }

  Future<void> enqueue(String method, String path, Map<String, dynamic>? body) async {
    final db = await database;
    await db.insert('queue', {
      'method': method,
      'path': path,
      'body': body != null ? jsonEncode(body) : null,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  Future<List<Map<String, dynamic>>> getPending() async {
    final db = await database;
    return db.query('queue', orderBy: 'id ASC');
  }

  Future<void> remove(int id) async {
    final db = await database;
    await db.delete('queue', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> cacheData(String key, Map<String, dynamic> data) async {
    final db = await database;
    await db.insert('cache', {
      'key': key,
      'data': jsonEncode(data),
      'updated_at': DateTime.now().toIso8601String(),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<Map<String, dynamic>?> getCachedData(String key) async {
    final db = await database;
    final results = await db.query('cache', where: 'key = ?', whereArgs: [key]);
    if (results.isEmpty) return null;
    return jsonDecode(results.first['data'] as String);
  }
}
