import type { ReactNode } from "react";
import { PageHeader, type PageHeaderProps } from "./PageHeader";
import { Card } from "./Card";
import "./CrudListLayout.css";

export interface CrudListLayoutProps {
  header: PageHeaderProps;
  summary?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  pagination?: ReactNode;
  className?: string;
}

export function CrudListLayout({ header, summary, toolbar, children, pagination, className = "" }: CrudListLayoutProps) {
  return (
    <div className={`crud-list-layout ${className}`}>
      <PageHeader {...header} />
      {summary && <section className="crud-list-summary" aria-label="Ringkasan data">{summary}</section>}
      <Card className="crud-list-card">
        {toolbar && <div className="crud-list-toolbar">{toolbar}</div>}
        <div className="crud-list-content">{children}</div>
        {pagination && <div className="crud-list-pagination">{pagination}</div>}
      </Card>
    </div>
  );
}

export default CrudListLayout;
