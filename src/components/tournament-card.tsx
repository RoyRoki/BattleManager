import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Tournament } from '../types';

interface TournamentCardProps {
  tournament: Tournament;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({ tournament }) => {
  const progress = (tournament.current_players / tournament.max_players) * 100;
  const isFull = tournament.current_players >= tournament.max_players;

  return (
    <Link to={`/tournament/${tournament.id}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="bg-bg-secondary border border-gray-800 rounded-lg overflow-hidden hover:border-primary transition"
      >
        {tournament.banner_url && (
          <div className="h-32 bg-gradient-to-r from-primary to-accent relative overflow-hidden">
            <img
              src={tournament.banner_url}
              alt={tournament.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40" />
          </div>
        )}

        <div className="p-4">
          <h3 className="text-lg font-heading text-primary mb-2">{tournament.name}</h3>
          {tournament.description && (
            <p className="text-sm text-gray-400 mb-3 line-clamp-2">
              {tournament.description}
            </p>
          )}

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400">Entry: {tournament.entry_amount} pts</span>
              <span className="text-gray-400">
                {tournament.current_players}/{tournament.max_players} players
              </span>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Players</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-bg-tertiary rounded-full h-2">
              <motion.div
                className={`h-2 rounded-full ${
                  isFull ? 'bg-accent' : 'bg-primary'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span
              className={`text-xs px-2 py-1 rounded ${
                tournament.status === 'upcoming'
                  ? 'bg-orange-900 text-orange-300'
                  : tournament.status === 'live'
                  ? 'bg-orange-950 text-orange-400'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {tournament.status.toUpperCase()}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(tournament.start_time).toLocaleDateString()}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};


