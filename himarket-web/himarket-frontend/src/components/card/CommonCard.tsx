import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../common';

interface FunModelCardProps {
  children?: React.ReactNode;
  to: string;
}

const CommonCard: React.FC<FunModelCardProps> = ({ children, to }) => {
  return (
    <Link to={to} className="h-full block">
      <Card
        variant="interactive"
        className="h-full relative overflow-hidden !rounded-claude-lg border-colorPrimary/20 bg-claude-neutral-50 shadow-claude-md transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-claude-lg group"
        styles={{ body: { padding: 0, height: '100%' } }}
      >
        {children}
      </Card>
    </Link>
  );
};

export default CommonCard;
