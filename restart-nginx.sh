#!/bin/bash
set -e

echo "Arrêt de tous les processus Nginx..."
sudo pkill -9 -f nginx || true
sleep 2

echo "Démarrage de Nginx..."
sudo systemctl start nginx
sleep 2

echo "Vérification du statut..."
if sudo systemctl is-active --quiet nginx; then
  echo "✓ Nginx est en cours d'exécution"
  echo "✓ LIFT GMAO est déployée sur http://lift.87.106.26.179"
  echo ""
  echo "Fichiers déployés:"
  ls -lah /var/www/lift-gmao/
else
  echo "✗ Erreur: Nginx n'a pas pu démarrer"
  sudo systemctl status nginx
  exit 1
fi
