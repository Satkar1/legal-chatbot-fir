// === case-management.js (final refined) ===

class CaseManager {
    constructor() {
        this.apiBase = 'http://localhost:5001/api/police';
        this.initDelegation();
    }

    // --- Event Delegation for buttons ---
    initDelegation() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-fir]');
            if (!btn) return;

            const fir = btn.dataset.fir;
            if (btn.classList.contains('btn-view')) {
                this.viewCaseDetails(fir);
            } else if (btn.classList.contains('btn-update')) {
                this.openStatusModal(fir);
            } else if (btn.classList.contains('btn-add-note')) {
                this.openAddNoteModal(fir);
            }
        });
    }

    // === Fetch case + activities ===
    async fetchCaseWithActivities(firNumber) {
        try {
            const res = await fetch(`${this.apiBase}/cases/${encodeURIComponent(firNumber)}`);
            return await res.json();
        } catch (err) {
            console.error('fetchCaseWithActivities error', err);
            return { success: false, error: err.message };
        }
    }

    // === Open modal to view full case details ===
    async viewCaseDetails(firNumber) {
        const modal = document.getElementById('caseModal') || this._createModalIfMissing();
        modal.style.display = 'block';
        modal.dataset.currentFir = firNumber;

        document.getElementById('modalFirTitle').textContent = `FIR #${firNumber}`;
        document.getElementById('modalCaseDetails').innerHTML = `<p>Loading case...</p>`;
        document.getElementById('modalTimeline').innerHTML = `<p>Loading timeline...</p>`;

        const data = await this.fetchCaseWithActivities(firNumber);
        if (!data.success) {
            document.getElementById('modalCaseDetails').innerHTML = `<p class="error">Error: ${data.error || 'Not found'}</p>`;
            document.getElementById('modalTimeline').innerHTML = '';
            return;
        }

        const rec = data.record || {};
        const acts = data.activities || [];

        // fill details
        document.getElementById('modalCaseDetails').innerHTML = `
            <p><b>Type:</b> ${this._escapeHtml(rec.incident_type || 'N/A')}</p>
            <p><b>Location:</b> ${this._escapeHtml(rec.incident_location || 'N/A')}</p>
            <p><b>Victim:</b> ${this._escapeHtml(rec.victim_name || 'N/A')}</p>
            <p><b>Officer:</b> ${this._escapeHtml(rec.investigating_officer || 'N/A')}</p>
            <p><b>Status:</b> ${this._escapeHtml(rec.status || 'N/A')}</p>
            <p><b>Description:</b> ${this._escapeHtml(rec.incident_description || 'N/A')}</p>
        `;

        // notes
        const notesArea = document.getElementById('updateNotes');
        if (notesArea) notesArea.value = rec.investigation_notes || '';

        // status select
        const sel = document.getElementById('updateStatusSelect');
        if (sel) sel.value = rec.status || 'under_investigation';

        // timeline
        const timeline = document.getElementById('modalTimeline');
        if (!acts.length) {
            timeline.innerHTML = '<p class="no-data">No activities recorded yet.</p>';
        } else {
            timeline.innerHTML = acts.map(a => {
                const when = a.activity_date ? new Date(a.activity_date).toLocaleString() : 'Unknown';
                return `
                    <div class="timeline-item" style="padding:10px;border-bottom:1px solid #eee;">
                        <b>${this._escapeHtml(a.title || a.activity_type || '')}</b> 
                        <span style="color:#777">by ${this._escapeHtml(a.officer_name || 'Unknown')}</span>
                        <p style="margin:6px 0;">${this._escapeHtml(a.description || '')}</p>
                        <small style="color:#999">${when}</small>
                    </div>`;
            }).join('');
        }
    }

    // === Open status modal directly (same as view but focuses edit area) ===
    async openStatusModal(firNumber) {
        const modal = document.getElementById('caseModal') || this._createModalIfMissing();
        modal.style.display = 'block';
        modal.dataset.currentFir = firNumber;

        // only load data once for update, don’t re-render full details
        const data = await this.fetchCaseWithActivities(firNumber);
        if (data.success && data.record) {
            const rec = data.record;
            const sel = document.getElementById('updateStatusSelect');
            const notesArea = document.getElementById('updateNotes');
            if (sel) sel.value = rec.status || 'under_investigation';
            if (notesArea) notesArea.value = rec.investigation_notes || '';
        }

        // focus status select for quick editing
        const sel = document.getElementById('updateStatusSelect');
        if (sel) sel.focus();
    }


    // === Add note prompt ===
    async openAddNoteModal(firNumber) {
        const note = prompt('Enter note to add to case ' + firNumber);
        if (!note) return;
        const officer = prompt('Officer name (optional):') || 'Dashboard User';
        const res = await this.addCaseNote(firNumber, 'Note added', note, officer);
        if (res && res.success) {
            alert('📝 Note added successfully');
            await this.viewCaseDetails(firNumber);
        } else {
            alert('❌ Failed to add note: ' + (res.error || 'unknown'));
        }
    }

    // === API calls ===
    async updateCaseStatus(firNumber, status, notes = '') {
        try {
            const resp = await fetch(`${this.apiBase}/cases/${encodeURIComponent(firNumber)}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, notes })
            });
            return await resp.json();
        } catch (err) {
            console.error('updateCaseStatus error', err);
            return { success: false, error: err.message };
        }
    }

    async addCaseNote(firNumber, title, description, officerName) {
        try {
            const resp = await fetch(`${this.apiBase}/cases/${encodeURIComponent(firNumber)}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    activity_type: 'note_added',
                    officer_name: officerName
                })
            });
            return await resp.json();
        } catch (err) {
            console.error('addCaseNote error', err);
            return { success: false, error: err.message };
        }
    }

    // --- Utility ---
    _escapeHtml(unsafe) {
        if (!unsafe && unsafe !== 0) return '';
        return String(unsafe)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    // --- Create modal dynamically if missing ---
    _createModalIfMissing() {
        let modal = document.getElementById('caseModal');
        if (modal) return modal;

        const container = document.createElement('div');
        container.id = 'caseModal';
        container.style.display = 'none';
        container.innerHTML = `
            <div class="modal-backdrop" onclick="document.getElementById('caseModal').style.display='none'"></div>
            <div class="modal-panel">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <h3 id="modalFirTitle">FIR</h3>
                    <button id="closeCaseModal">✖</button>
                </div>
                <div id="modalCaseDetails"></div>
                <div id="modalTimeline"></div>

                <div style="margin-top:10px;">
                    <label>Status:</label>
                    <select id="updateStatusSelect">
                        <option value="registered">Registered</option>
                        <option value="under_investigation">Under Investigation</option>
                        <option value="charges_filed">Charges Filed</option>
                        <option value="court_proceeding">Court Proceeding</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                    </select>
                    <textarea id="updateNotes" placeholder="Add investigation notes..."></textarea>
                    <button id="modalSaveStatusBtn">💾 Save</button>
                    <button id="modalAddNoteBtn">📝 Add Note</button>
                </div>
            </div>
        `;
        document.body.appendChild(container);

        // close button
        container.querySelector('#closeCaseModal').addEventListener('click', () => {
            container.style.display = 'none';
        });

        // save handler
        container.querySelector('#modalSaveStatusBtn').addEventListener('click', async () => {
            const fir = container.dataset.currentFir;
            const status = document.getElementById('updateStatusSelect').value;
            const notes = document.getElementById('updateNotes').value || '';
            const res = await this.updateCaseStatus(fir, status, notes);
            if (res && res.success) {
                alert('✅ Status updated successfully');
                container.style.display = 'none';
                if (window.policeDashboard) {
                    window.policeDashboard.loadPendingCases();
                    window.policeDashboard.loadCaseUpdates();
                }
            } else {
                alert('❌ Update failed: ' + (res.error || 'unknown'));
            }
        });

        // note handler
        container.querySelector('#modalAddNoteBtn').addEventListener('click', async () => {
            const fir = container.dataset.currentFir;
            const note = document.getElementById('updateNotes').value || '';
            if (!note) return alert('Enter note first');
            const officer = prompt('Officer name (optional):') || 'Dashboard User';
            const res = await this.addCaseNote(fir, 'Note Added', note, officer);
            if (res && res.success) {
                alert('📝 Note added');
                container.style.display = 'none';
            } else {
                alert('❌ Failed to add note: ' + (res.error || 'unknown'));
            }
        });

        return container;
    }
}

// export global instance
window.caseManager = new CaseManager();
