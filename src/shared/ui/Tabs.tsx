import React, { useState } from 'react';
import './Tabs.css';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultSelected?: string;
  onChange?: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, defaultSelected, onChange }) => {
  const [activeTab, setActiveTab] = useState(defaultSelected || tabs[0].id);

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    if (onChange) onChange(id);
  };

  return (
    <div className="ui-tabs-container">
      <div className="ui-tabs-header">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`ui-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="ui-tabs-content">
        {tabs.find(t => t.id === activeTab)?.content}
      </div>
    </div>
  );
};
