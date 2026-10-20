<?php

declare(strict_types=1);

namespace FitLife\Services;

class Notifier
{
    /** Envoie la même notification à tous les utilisateurs, sauf l'auteur. */
    public static function broadcast(string $fromUserId, string $type, string $title, string $body): void
    {
        $db = db();
        $users = $db->prepare('SELECT id FROM users WHERE id <> ?');
        $users->execute([$fromUserId]);
        $ins = $db->prepare('INSERT INTO notifications (id, user_id, type, title, body) VALUES (?,?,?,?,?)');
        foreach ($users->fetchAll(\PDO::FETCH_COLUMN) as $uid) {
            $ins->execute([uid('notif'), $uid, $type, mb_substr($title, 0, 120), mb_substr($body, 0, 500)]);
        }
    }

    /** Date lisible en français : « samedi 17 octobre à 07:00 ». */
    public static function longDate(string $datetime): string
    {
        $days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        $months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        $ts = strtotime($datetime);
        return $days[(int) date('w', $ts)] . ' ' . date('j', $ts) . ' ' . $months[(int) date('n', $ts) - 1] . ' à ' . date('H:i', $ts);
    }
}
