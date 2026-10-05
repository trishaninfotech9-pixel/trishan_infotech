<?php
// API response wrapper. Mirrors vendor/classess/layout/layout.class.php pattern (layout -> output).
class response extends dbcon {
  public static function ok(array $data = []): void {
    self::json(['ok' => true] + $data);
  }
  public static function fail(string $error, int $code = 400): void {
    self::json(['ok' => false, 'error' => $error], $code);
  }
}
