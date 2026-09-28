import React, { useEffect, useState, useMemo } from 'react';
import styles from './Import.module.css';
import { API_ENDPOINTS } from '../../config/api';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import toast from 'react-hot-toast';

const SvgIcon = ({ path }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={styles.icon} viewBox="0 0 24 24" fill="currentColor">
        <path d={path} />
    </svg>
);

export default function ImportListTab() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        type: 'warning'
    });

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.DOCUMENT.LIST, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await res.json();
        setFiles(data.documents || []);
      } catch (err) {
        console.error("Lỗi khi tải danh sách file:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, []);

  const clearFilters = () => {
    setNameFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      // filter by name
      if (nameFilter) {
        const title = (file.title || '').toLowerCase();
        if (!title.includes(nameFilter.trim().toLowerCase())) return false;
      }

      // filter by date range
      if (dateFrom || dateTo) {
        const fileDate = file.create_time ? new Date(file.create_time) : null;
        if (!fileDate || isNaN(fileDate.getTime())) return false;
        if (dateFrom) {
          const from = new Date(dateFrom + 'T00:00:00');
          if (fileDate < from) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo + 'T23:59:59');
          if (fileDate > to) return false;
        }
      }

      return true;
    });
  }, [files, nameFilter, dateFrom, dateTo]);

  const openPreveiwModal = (file) => {
    console.log(file)
  }

  const openDownloadModal = (file) => {
    console.log(file)
  }


  const handleDeleteUser = async (id) => {
      const fileToDelete = files.find(file => file.id === id);
      
      setConfirmModal({
          isOpen: true,
          title: 'Xóa tài liệu',
          message: `Bạn có chắc chắn muốn xóa file "${fileToDelete?.tableContainer || id}"? Hành động này không thể hoàn tác.`,
          type: 'danger',
          onConfirm: async () => {
              // gọi API để xóa file
              fetch(API_ENDPOINTS.DOCUMENT.DELETE(id), {
                  method: 'DELETE',
                  headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                  }
              })
                  .then(response => {
                      if (!response.ok) {
                          throw new Error('Không thể xóa file.');
                      }
                      return response.json();
                  })
                  .then(async () => {
                      // gọi lại api để cập nhật danh sách file
                      const updatedResponse = await fetch(API_ENDPOINTS.DOCUMENT.LIST, {
                          headers: {
                              'Authorization': `Bearer ${localStorage.getItem('token')}`
                          }
                      });
                      const updatedData = await updatedResponse.json();
                      setFiles(updatedData.documents);
                      toast.success('Xóa file thành công!');
                  })
                  .catch(error => {
                      // console.error('Lỗi khi xóa file:', error);
                      toast.error(`Đã xảy ra lỗi: ${error.message}`);
                  })
          }
      });
  };

  if (loading) return <div>Đang tải danh sách...</div>;

  return (
    <>
      <div className={styles.tableWrapper}>  
        <div className={styles.tableContainer}>
          {files.length === 0 ? (
          <p className={styles.outFile}>Chưa có file nào được tải lên!</p>
        ) : (
          <div className={styles.listScroll}>
            <div className={styles.filterBar}>
              <input
                className={styles.filterInput}
                placeholder="Tìm theo tên tài liệu"
                value={nameFilter}
                onChange={e => setNameFilter(e.target.value)}
                aria-label="Lọc theo tên"
              />
              <div className={styles.dateFilters}>
                <div>
                  <span className={styles.spanFilter}>Từ </span>
                  <input
                    className={styles.dateInput}
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    aria-label="Từ ngày"
                  />
                </div>
                <div>
                  <span className={styles.spanFilter}>Đến </span>
                  <input
                    className={styles.dateInput}
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    aria-label="Đến ngày"
                  />
                </div>
                <button className={styles.clearButton} onClick={clearFilters} aria-label="Xóa bộ lọc">Xóa lọc</button>
              </div>
            </div>
            <table className={styles.dataTable}>
              <tbody>
                <tr className={styles.trHeader}>
                  <th className={styles.colTitleHeader}>Tên tào liệu</th>
                  <th className={styles.colDateHeader}>Ngày tạo</th>
                  <th className={styles.colActionHeader}>Thao tác</th>
                </tr>
                {filteredFiles.map(file => (
                  <tr key={file.id}>
                    <td className={styles.colTitle}>
                        <span>
                          <svg className={styles.iconSVG} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1em" height="1em">
                            <path fill="#DCE2E2" d="M433.694 507.594H78.306c-11.929 0-21.6-9.671-21.6-21.6V25.317c0-11.929 9.671-21.6 21.6-21.6h263.026l113.961 112.739v369.538c.001 11.929-9.67 21.6-21.599 21.6"></path>
                            <path fill="#96A9B2" d="M292.284 79.728H106.557a7.904 7.904 0 0 1 0-15.808h185.728a7.904 7.904 0 1 1-.001 15.808m-20.594 46.49a7.904 7.904 0 0 0-7.904-7.904H106.557a7.904 7.904 0 0 0 0 15.808h157.229a7.904 7.904 0 0 0 7.904-7.904m123.269 54.394a7.904 7.904 0 0 0-7.904-7.904H106.557a7.904 7.904 0 0 0 0 15.808h280.498a7.904 7.904 0 0 0 7.904-7.904m-17.603 54.393a7.904 7.904 0 0 0-7.904-7.904H106.557a7.904 7.904 0 0 0 0 15.808h262.896a7.903 7.903 0 0 0 7.903-7.904M271.69 289.399a7.904 7.904 0 0 0-7.904-7.904H106.557a7.904 7.904 0 0 0 0 15.808h157.229a7.903 7.903 0 0 0 7.904-7.904m123.269 54.394a7.904 7.904 0 0 0-7.904-7.904H106.557a7.904 7.904 0 0 0 0 15.808h280.498a7.904 7.904 0 0 0 7.904-7.904m0 54.394a7.904 7.904 0 0 0-7.904-7.904H106.557a7.904 7.904 0 0 0 0 15.808h280.498a7.904 7.904 0 0 0 7.904-7.904m0 54.393a7.904 7.904 0 0 0-7.904-7.904H106.557a7.904 7.904 0 0 0 0 15.808h280.498a7.904 7.904 0 0 0 7.904-7.904"></path>
                            <path fill="#B9C5C6" d="m341.333 3.717l112.739 112.739h-88.776c-13.235 0-23.963-10.729-23.963-23.963z"></path>
                          </svg>
                          <span className={styles.sidebarSpanStrong}>{file.title}</span>
                        </span>
                    </td>
                    <td className={styles.colDate}>
                      <span className={styles.sidebarSpanStrong}>{formatCreateTime(file.create_time)}</span>
                    </td>
                    <td>
                      <div className={styles.actionCell}>
                          {/* <button className={styles.actionButton} onClick={() => openPreveiwModal(file)} aria-label="Xem">
                          <SvgIcon path="M12 6.5a9.77 9.77 0 0 1 8.82 5.5c-1.65 3.37-5.02 5.5-8.82 5.5S4.83 15.37 3.18 12A9.77 9.77 0 0 1 12 6.5m0-2C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5m0 5a2.5 2.5 0 0 1 0 5a2.5 2.5 0 0 1 0-5m0-2c-2.48 0-4.5 2.02-4.5 4.5s2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5s-2.02-4.5-4.5-4.5" />
                          <span>Xem trước</span>
                          </button>
                          <button className={`${styles.actionButton} ${styles.changepassword}`} onClick={() => openDownloadModal(file)} aria-label="Đổi MK">
                              <SvgIcon path="M5 20h14v-2H5zM19 9h-4V3H9v6H5l7 7z" />
                              <span>Tải xuống</span>
                          </button> */}
                            <button className={`${styles.actionButton} ${styles.delete} ${styles.colAction}`} onClick={() => handleDeleteUser(file.id)} aria-label="Xóa">
                              <SvgIcon path="m18.412 6.5l-.801 13.617A2 2 0 0 1 15.614 22H8.386a2 2 0 0 1-1.997-1.883L5.59 6.5H3.5v-1A.5.5 0 0 1 4 5h16a.5.5 0 0 1 .5.5v1zM10 2.5h4a.5.5 0 0 1 .5.5v1h-5V3a.5.5 0 0 1 .5-.5M9 9l.5 9H11l-.4-9zm4.5 0l-.5 9h1.5l.5-9z" />
                              <span>Xóa</span>
                          </button>
                      </div>
                    </td>
                </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
    </div>

    {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </>
  );
}

// helper: format create_time to readable local string
function formatCreateTime(value) {
  if (!value) return '-';
  // accept ISO or timestamp; try Date parse
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}
