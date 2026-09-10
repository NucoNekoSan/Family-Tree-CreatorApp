<?php
declare(strict_types=1);

use Kakeizu\App;

if ($route === '/auth/login' && $method === 'POST') {
    $input = App::input();
    $loginId = trim((string)($input['loginId'] ?? ''));
    $password = (string)($input['password'] ?? '');
    App::assertLoginAllowed($loginId);

    $query = $db->prepare('SELECT * FROM users WHERE login_id=?');
    $query->execute([$loginId]);
    $user = $query->fetch();
    $valid = $user
        ? password_verify($password, $user['password_hash'])
        : password_verify($password, '$2y$10$C6UzMDM.H6dfI/f/IKcEe.yrN9gY0bXBnc5QyS4XSvR7PpZeRXQ9u');

    if (!$user || !$valid) {
        App::recordLoginFailure($loginId);
        App::fail(401, 'INVALID_CREDENTIALS', 'ログインIDまたはパスワードが違います');
    }

    if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
        $db->prepare('UPDATE users SET password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
            ->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
    }

    App::clearLoginFailures($loginId);
    $raw = App::token();
    $csrf = App::token();
    $db->beginTransaction();
    $db->prepare("DELETE FROM sessions WHERE expires_at<=CURRENT_TIMESTAMP OR COALESCE(last_seen_at,created_at)<=datetime('now','-12 hours')")->execute();
    $db->prepare('INSERT INTO sessions(id_hash,user_id,csrf_token,expires_at,last_seen_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)')
        ->execute([hash('sha256', $raw), $user['id'], $csrf, App::now('+30 days')]);
    $db->prepare('DELETE FROM sessions WHERE user_id=? AND id_hash NOT IN (SELECT id_hash FROM sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 5)')
        ->execute([$user['id'], $user['id']]);
    $db->commit();
    App::setSessionCookie($raw, time() + 2592000);
    App::ok(['user' => ['id' => $user['id'], 'loginId' => $user['login_id']], 'csrfToken' => $csrf]);
}

if ($route === '/auth/session' && $method === 'GET') {
    $user = owner();
    App::ok(['user' => ['id' => $user['id'], 'loginId' => $user['login_id']], 'csrfToken' => $user['csrf_token']]);
}

if ($route === '/auth/logout' && $method === 'POST') {
    owner(true);
    $raw = $_COOKIE['kakeizu_session'] ?? '';
    $db->prepare('DELETE FROM sessions WHERE id_hash=?')->execute([hash('sha256', $raw)]);
    App::setSessionCookie('', time() - 3600);
    App::ok();
}
