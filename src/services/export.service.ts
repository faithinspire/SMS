/**
 * Export Service
 * Handles CSV and PDF export of results
 */

export class ExportService {
  /**
   * Export results to CSV format
   * Returns CSV string ready for download
   */
  static generateResultsCSV(
    results: any[],
    title: string = 'Results Report'
  ): string {
    try {
      console.log(`📊 Generating CSV for ${title}...`)

      if (!results || results.length === 0) {
        return 'No data to export'
      }

      // Determine columns from first result
      const firstResult = results[0]
      const columns: string[] = []

      // Standard result columns
      if ('subjects' in firstResult && firstResult.subjects?.name) {
        columns.push('Subject')
      }
      if ('full_name' in firstResult || 'students' in firstResult) {
        columns.push('Student Name')
      }
      if ('test1' in firstResult) {
        columns.push('Test 1')
      }
      if ('test2' in firstResult) {
        columns.push('Test 2')
      }
      if ('test3' in firstResult) {
        columns.push('Test 3')
      }
      if ('test4' in firstResult) {
        columns.push('Test 4')
      }
      if ('exam' in firstResult) {
        columns.push('Exam')
      }
      if ('total' in firstResult) {
        columns.push('Total')
      }
      if ('grade' in firstResult) {
        columns.push('Grade')
      }
      if ('percentage' in firstResult) {
        columns.push('Percentage')
      }

      // Build header
      let csv = `${title}\n`
      csv += `Generated: ${new Date().toLocaleString()}\n\n`
      csv += columns.join(',') + '\n'

      // Build rows
      for (const result of results) {
        const row: string[] = []

        if (columns.includes('Subject')) {
          row.push(this.escapeCsvValue(result.subjects?.name || ''))
        }
        if (columns.includes('Student Name')) {
          const name = result.full_name || result.students?.users?.full_name || ''
          row.push(this.escapeCsvValue(name))
        }
        if (columns.includes('Test 1')) {
          row.push(result.test1 ?? '')
        }
        if (columns.includes('Test 2')) {
          row.push(result.test2 ?? '')
        }
        if (columns.includes('Test 3')) {
          row.push(result.test3 ?? '')
        }
        if (columns.includes('Test 4')) {
          row.push(result.test4 ?? '')
        }
        if (columns.includes('Exam')) {
          row.push(result.exam ?? '')
        }
        if (columns.includes('Total')) {
          row.push(result.total ?? '')
        }
        if (columns.includes('Grade')) {
          row.push(result.grade ?? '')
        }
        if (columns.includes('Percentage')) {
          row.push(result.percentage ?? '')
        }

        csv += row.join(',') + '\n'
      }

      console.log('✅ CSV generated')
      return csv
    } catch (err: any) {
      console.error('❌ Error generating CSV:', err)
      throw err
    }
  }

  /**
   * Download CSV file
   */
  static downloadCSV(csvContent: string, filename: string = 'results.csv'): void {
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log('✅ CSV downloaded')
    } catch (err: any) {
      console.error('❌ Error downloading CSV:', err)
      throw err
    }
  }

  /**
   * Generate HTML report for printing/PDF
   */
  static generateHTMLReport(
    data: any,
    type: 'student' | 'class' | 'transcript' = 'student'
  ): string {
    try {
      console.log(`📄 Generating HTML report (${type})...`)

      let html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Results Report</title>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                margin: 20px;
                color: #333;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #0066cc;
                padding-bottom: 15px;
              }
              .school-name {
                font-size: 24px;
                font-weight: bold;
                color: #0066cc;
              }
              .report-title {
                font-size: 18px;
                margin-top: 10px;
                color: #666;
              }
              .info-section {
                margin-bottom: 20px;
                padding: 15px;
                background-color: #f9f9f9;
                border-left: 4px solid #0066cc;
              }
              .info-label {
                font-weight: bold;
                color: #0066cc;
                display: inline-block;
                width: 150px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th {
                background-color: #0066cc;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: bold;
              }
              td {
                padding: 10px 12px;
                border-bottom: 1px solid #ddd;
              }
              tr:nth-child(even) {
                background-color: #f9f9f9;
              }
              .grade-A { background-color: #d4edda; color: #155724; font-weight: bold; }
              .grade-B { background-color: #d1ecf1; color: #0c5460; font-weight: bold; }
              .grade-C { background-color: #fff3cd; color: #856404; font-weight: bold; }
              .grade-D { background-color: #f8d7da; color: #721c24; font-weight: bold; }
              .grade-F { background-color: #f5c6cb; color: #721c24; font-weight: bold; }
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 12px;
                color: #999;
                border-top: 1px solid #ddd;
                padding-top: 15px;
              }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="school-name">School Management System</div>
              <div class="report-title">Academic Results Report</div>
              <div style="font-size: 12px; color: #999;">
                Generated: ${new Date().toLocaleString()}
              </div>
            </div>
      `

      if (type === 'student' && data.student_info) {
        html += `
          <div class="info-section">
            <div><span class="info-label">Student Name:</span> ${data.student_info.name}</div>
            <div><span class="info-label">Admission Number:</span> ${data.student_info.admission_number}</div>
            <div><span class="info-label">Email:</span> ${data.student_info.email}</div>
          </div>
          <div class="info-section">
            <div><span class="info-label">Class:</span> ${data.class_info.class_name} - Arm ${data.class_info.arm_name}</div>
            <div><span class="info-label">Class Teacher:</span> ${data.class_info.class_teacher_name}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Test 1</th>
                <th>Test 2</th>
                <th>Test 3</th>
                <th>Test 4</th>
                <th>Exam</th>
                <th>Total</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
        `
        if (data.results && Array.isArray(data.results)) {
          for (const result of data.results) {
            const gradeClass = `grade-${result.grade || 'F'}`
            html += `
              <tr>
                <td>${result.subject_name || ''}</td>
                <td>${result.test1 ?? '-'}</td>
                <td>${result.test2 ?? '-'}</td>
                <td>${result.test3 ?? '-'}</td>
                <td>${result.test4 ?? '-'}</td>
                <td>${result.exam ?? '-'}</td>
                <td><strong>${result.total ?? '-'}</strong></td>
                <td><span class="${gradeClass}">${result.grade || 'N/A'}</span></td>
              </tr>
            `
          }
        }
        html += `
            </tbody>
          </table>
        `
      } else if (type === 'class' && Array.isArray(data)) {
        html += `
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Test 1</th>
                <th>Test 2</th>
                <th>Test 3</th>
                <th>Test 4</th>
                <th>Exam</th>
                <th>Total</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
        `
        for (const result of data) {
          const gradeClass = `grade-${result.grade || 'F'}`
          const studentName = result.students?.users?.full_name || 'Unknown'
          html += `
            <tr>
              <td>${studentName}</td>
              <td>${result.test1 ?? '-'}</td>
              <td>${result.test2 ?? '-'}</td>
              <td>${result.test3 ?? '-'}</td>
              <td>${result.test4 ?? '-'}</td>
              <td>${result.exam ?? '-'}</td>
              <td><strong>${result.total ?? '-'}</strong></td>
              <td><span class="${gradeClass}">${result.grade || 'N/A'}</span></td>
            </tr>
          `
        }
        html += `
            </tbody>
          </table>
        `
      } else if (type === 'transcript' && data.results_by_term) {
        html += `
          <div class="info-section">
            <div><span class="info-label">Student Name:</span> ${data.student_info?.name}</div>
            <div><span class="info-label">Admission Number:</span> ${data.student_info?.admission_number}</div>
            <div><span class="info-label">GPA:</span> <strong>${data.gpa || 'N/A'}</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Term</th>
                <th>Subject</th>
                <th>Total</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
        `
        for (const result of data.results_by_term) {
          const gradeClass = `grade-${result.grade || 'F'}`
          const termName = result.academic_terms?.term_name || 'Unknown'
          const subjectName = result.subjects?.name || 'Unknown'
          html += `
            <tr>
              <td>${termName}</td>
              <td>${subjectName}</td>
              <td><strong>${result.total ?? '-'}</strong></td>
              <td><span class="${gradeClass}">${result.grade || 'N/A'}</span></td>
            </tr>
          `
        }
        html += `
            </tbody>
          </table>
        `
      }

      html += `
            <div class="footer">
              <p>This is an official academic report. Please contact the school for inquiries.</p>
              <p style="margin-top: 20px;">&copy; ${new Date().getFullYear()} School Management System</p>
            </div>
          </body>
        </html>
      `

      console.log('✅ HTML report generated')
      return html
    } catch (err: any) {
      console.error('❌ Error generating HTML report:', err)
      throw err
    }
  }

  /**
   * Open report in new window for printing
   */
  static printReport(htmlContent: string, title: string = 'Results Report'): void {
    try {
      const printWindow = window.open('', '', 'width=800,height=600')
      if (!printWindow) {
        throw new Error('Could not open print window')
      }

      printWindow.document.write(htmlContent)
      printWindow.document.close()

      // Give it time to render before printing
      setTimeout(() => {
        printWindow.print()
      }, 250)

      console.log('✅ Print dialog opened')
    } catch (err: any) {
      console.error('❌ Error opening print:', err)
      throw err
    }
  }

  /**
   * Escape special characters for CSV
   */
  private static escapeCsvValue(value: string): string {
    if (!value) return ''

    // Escape quotes and wrap in quotes if contains comma or newline
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"` 
    }
    return value
  }
}
