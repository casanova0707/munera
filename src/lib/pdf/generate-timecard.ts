import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TimecardUser {
  user: { full_name: string; employee_code: string | null; department: string | null };
  records: {
    work_date: string;
    shift_name: string | null;
    clock_in: string | null;
    clock_out: string | null;
    work_min: number;
    break_min: number;
    overtime_min: number;
    is_late: boolean;
    is_early_leave: boolean;
  }[];
  totals: { work_min: number; break_min: number; overtime_min: number; late_count: number; early_leave_count: number };
}

interface TimecardData {
  period: { from: string; to: string };
  users: TimecardUser[];
}

function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export async function generateTimecardPDF(data: TimecardData): Promise<void> {
  // Load Japanese font
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

    const { user, records, totals } = userData;

    // Header
    doc.setFontSize(16);
    doc.text("タイムカード", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.text(`期間: ${data.period.from} ～ ${data.period.to}`, pageWidth / 2, 28, { align: "center" });

    // User info
    doc.setFontSize(11);
    doc.text(`氏名: ${user.full_name}`, 14, 38);
    doc.text(`社員番号: ${user.employee_code ?? "-"}`, 14, 44);
    doc.text(`部署: ${user.department ?? "-"}`, 100, 38);

    // Table
    const head = [["日付", "シフト", "出勤", "退勤", "実働", "休憩", "残業", "備考"]];
    const body = records.map((r) => [
      r.work_date,
      r.shift_name ?? "-",
      r.clock_in ?? "-",
      r.clock_out ?? "-",
      formatMin(r.work_min),
      formatMin(r.break_min),
      r.overtime_min > 0 ? formatMin(r.overtime_min) : "-",
      [r.is_late ? "遅刻" : "", r.is_early_leave ? "早退" : ""].filter(Boolean).join("/") || "",
    ]);

    // Totals row
    body.push([
      "合計", "", "", "",
      formatMin(totals.work_min),
      formatMin(totals.break_min),
      formatMin(totals.overtime_min),
      `遅刻${totals.late_count} 早退${totals.early_leave_count}`,
    ]);

    autoTable(doc, {
      startY: 50,
      head,
      body,
      styles: {
        font: font ? "NotoSansJP" : "helvetica",
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [30, 30, 30],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "normal",
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 18 },
        2: { cellWidth: 16 },
        3: { cellWidth: 16 },
        4: { cellWidth: 16 },
        5: { cellWidth: 16 },
        6: { cellWidth: 16 },
      },
      didParseCell: (hookData) => {
        // Style the totals row
        if (hookData.row.index === body.length - 1) {
          hookData.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });
  }

  doc.save(`タイムカード_${data.period.from}_${data.period.to}.pdf`);
}

async function loadNotoSansJP(): Promise<string | null> {
  try {
    // Try to load NotoSansJP from public/fonts/
    const res = await fetch("/fonts/NotoSansJP-Regular.ttf");
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    // Convert to base64
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
