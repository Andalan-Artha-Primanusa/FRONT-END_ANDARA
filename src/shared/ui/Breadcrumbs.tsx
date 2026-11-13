import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import './Breadcrumbs.css';

interface BreadcrumbsProps {
  items: { label: string; path?: string }[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="ui-breadcrumbs" aria-label="Breadcrumb">
      <ol className="ui-breadcrumbs-list">
        <li className="ui-breadcrumbs-item">
          <a href="/" className="ui-breadcrumbs-link">
            <Home size={14} />
          </a>
          <ChevronRight size={14} className="ui-breadcrumbs-separator" />
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="ui-breadcrumbs-item">
              {isLast || !item.path ? (
                <span className="ui-breadcrumbs-current" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <>
                  <a href={item.path} className="ui-breadcrumbs-link">
                    {item.label}
                  </a>
                  <ChevronRight size={14} className="ui-breadcrumbs-separator" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
