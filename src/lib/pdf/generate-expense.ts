import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExpenseUser {
  user: { full_name: string; employee_code: string | null; department: string | null };
  records: {
    expense_date: string;
    category: string;
    description: string | null;
    amount: number;
    status: string;
  }[];
  total_amount: number;
}

interface ExpenseData {
  period: { from: string; to: string };
  users: ExpenseUser[];
}

const statusLabel: Record<string, string> = {
  draft: "下書き",
  submitted: "申請中",
  approved: "承認済",
  rejected: "却下",
};

export async function generateExpensePDF(data: ExpenseData): Promise<void> {
  const font = await loadNotoSansJP();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  if (font) {
    doc.addFileToVFS("NotoSansJP-Regular.ttf", font);
    doc.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
    doc.setFont("NotoSansJP");
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  let isFirstUser = true;

  for (const userData of data.users) {
    if (!isFirstUser) doc.addPage();
    isFirstUser = false;

    const { user, records, total_amount } = userData;

    // Header
    doc.setFontSize(16);
    doc.text("交通費精算書", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.text(`期間: ${data.period.from} ～ ${data.period.to}`, pageWidth / 2, 28, { align: "center" });

    // User info
    doc.setFontSize(11);
    doc.text(`氏名: ${user.full_name}`, 14, 38);
    doc.text(`社員番号: ${user.employee_code ?? "-"}`, 14, 44);
    doc.text(`部署: ${user.department ?? "-"}`, 100, 38);

    // Table
    const head = [["日付", "カテゴリ", "摘要", "金額", "状態"]];
    const body = records.map((r) => [
      r.expense_date,
      r.category,
      r.description ?? "-",
      `¥${r.amount.toLocaleString()}`,
      statusLabel[r.status] ?? r.status,
    ]);

    // Totals row
    body.push(["合計", "", "", `¥${total_amount.toLocaleString()}`, ""]);

    autoTable(doc, {
      startY: 50,
      head,
      body,
      styles: {
        font: font ? "NotoSansJP" : "helvetica",
        fontSize: 9,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [30, 30, 30],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: "normal",
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        3: { cellWidth: 25, halign: "right" },
        4: { cellWidth: 20 },
      },
      didParseCell: (hookData) => {
        if (hookData.row.index === body.length - 1) {
          hookData.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });
  }

  doc.save(`交通費精算書_${data.period.from}_${data.period.to}.pdf`);
}

async function loadNotoSansJP(): Promise<string | null> {
  try {
    const res = await fetch("/fonts/NotoSansJP-Regular.ttf");
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return null;
  }
}
