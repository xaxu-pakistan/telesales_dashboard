"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportButton({ data }) {
  const handleExport = () => {
    if (!data || data.length === 0) return;

    const headers = [
      "Name", "Email", "Phone", "Tags", "Note", 
      "Last Order", "Last Order Date", "Items", "Amount", "Follow-up Date", "Status"
    ];

    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = data.map(c => {
      const name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
      const tags = c.tags ? c.tags.join(', ') : '';
      const items = c.lastOrder ? c.lastOrder.items.join(', ') : '';
      
      let formattedDate = '';
      if (c.lastOrder && c.lastOrder.date) {
        formattedDate = new Date(c.lastOrder.date).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
      }
      
      return [
        escapeCSV(name),
        escapeCSV(c.email),
        escapeCSV(c.phone),
        escapeCSV(tags),
        escapeCSV(c.note),
        escapeCSV(c.lastOrder?.name),
        escapeCSV(formattedDate),
        escapeCSV(items),
        escapeCSV(c.lastOrder?.amount),
        escapeCSV(c.followupDate),
        escapeCSV(c.followupStatus)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
      <Download className="w-4 h-4" /> Export CSV
    </Button>
  );
}
