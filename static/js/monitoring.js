document.addEventListener('DOMContentLoaded', function() {
    // 타이머 관련 변수들
    let currentTimeMode = 'stopwatch';
    let timerInterval;
    let stopwatchInterval;
    let time = 0;
    let isRunning = false;

    // 비디오 녹화 관련 변수
    let mediaRecorder;
    let recordedChunks = [];
    let recordingDuration = 0;
    let postureRecords = [];
    let badPostureCount = 0;
    let recordingStartTime;

     // 비디오 스트림 가져오기
     navigator.mediaDevices.getUserMedia({ video: true })
     .then(stream => {
         const videoElement = document.getElementById('videoElement');
         videoElement.srcObject = stream;

         // MediaRecorder 초기화
         mediaRecorder = new MediaRecorder(stream);

         mediaRecorder.ondataavailable = event => {
             if (event.data.size > 0) {
                 recordedChunks.push(event.data);
             }
         };

         mediaRecorder.onstop = async () => {
             const blob = new Blob(recordedChunks, { type: 'video/webm' });
             const formData = new FormData();
             
             // 영상 데이터 추가
             formData.append('video', blob);
             
             // 자세 데이터 추가
             const postureData = {
                 duration: recordingDuration,
                 records: postureRecords,
                 bad_posture_count: badPostureCount,
                 start_time: recordingStartTime,
                 end_time: new Date().toISOString()
             };
             
             formData.append('posture_data', JSON.stringify(postureData));

             try {
                 // 영상 저장 요청
                 const response = await fetch('/api/videos', {
                     method: 'POST',
                     body: formData
                 });

                 if (response.ok) {
                     const result = await response.json();
                     alert('녹화가 성공적으로 저장되었습니다.');
                     
                     // 녹화 데이터 초기화
                     recordedChunks = [];
                     postureRecords = [];
                     badPostureCount = 0;
                     recordingDuration = 0;
                 } else {
                     throw new Error('영상 저장 실패');
                 }
             } catch (error) {
                 console.error('녹화 저장 오류:', error);
                 alert('녹화 저장에 실패했습니다.');
             }
         };

             // 녹화 시작 버튼
            document.getElementById('recordBtn').addEventListener('click', () => {
                recordedChunks = [];
                postureRecords = [];
                badPostureCount = 0;
                recordingDuration = 0;
                recordingStartTime = new Date().toISOString();
                
                mediaRecorder.start();
                document.getElementById('recordBtn').disabled = true;
                document.getElementById('stopBtn').disabled = false;
            });

            // 녹화 중지 버튼
            document.getElementById('stopBtn').addEventListener('click', () => {
                mediaRecorder.stop();
                document.getElementById('recordBtn').disabled = false;
                document.getElementById('stopBtn').disabled = true;
            });
        })
        .catch(error => {
            console.error("카메라 접근 오류:", error);
        });

        // 자세 데이터 수집 함수
    function updatePostureData(angle, distance, isBadPosture) {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            postureRecords.push({
                timestamp: new Date().toISOString(),
                neck_angle: angle,
                face_distance: distance,
                is_bad_posture: isBadPosture
            });
            
            if (isBadPosture) {
                badPostureCount++;
            }
            
            recordingDuration = Math.floor((new Date() - new Date(recordingStartTime)) / 1000);
        }
    }

    // PostureMonitor에서 자세 데이터 업데이트 시 호출
    function onPostureUpdate(angle, distance, isBadPosture) {
        updatePostureData(angle, distance, isBadPosture);
     }
     

    // 시작/일시정지 버튼
    document.getElementById('startBtn').addEventListener('click', function() {
        if (currentTimeMode === 'stopwatch') {
            handleStopwatch();
        } else {
            handleTimer();
        }
    });

    // 초기화 버튼
    document.getElementById('resetBtn').addEventListener('click', resetAll);

    // 타이머 시간 조절 버튼
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const unit = this.dataset.unit;
            const direction = this.classList.contains('up') ? 1 : -1;
            const input = document.getElementById(`${unit}Input`);
            let value = parseInt(input.value);

            const maxValues = { hours: 99, minutes: 59, seconds: 59 };

            value += direction;
            if (value < 0) value = 0;
            if (value > maxValues[unit]) value = maxValues[unit];

            input.value = String(value).padStart(2, '0');
        });
    });

    // 메모/투두 패널 전환
    document.querySelectorAll('.control-section .mode-toggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // 토글 버튼 활성화 상태 변경
            document.querySelectorAll('.control-section .toggle-btn').forEach(b => 
                b.classList.remove('active'));
            this.classList.add('active');

            // 패널 전환
            const targetPanel = this.dataset.mode;
            document.querySelectorAll('.panel').forEach(panel => {
                if (panel.id === `${targetPanel}Panel`) {
                    panel.style.display = 'block';
                    panel.style.opacity = '1';
                } else {
                    panel.style.display = 'none';
                    panel.style.opacity = '0';
                }
            });
        });
    });

    // 타이머/스톱워치 모드 전환
    document.querySelectorAll('.time-section .mode-toggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const mode = this.dataset.mode;
            if (mode === currentTimeMode) return;

            document.querySelectorAll('.time-section .toggle-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            currentTimeMode = mode;
            resetAll();

            const timerControls = document.querySelector('.timer-controls');
            timerControls.style.display = mode === 'timer' ? 'flex' : 'none';
        });
    });

    function handleStopwatch() {
        if (isRunning) {
            clearInterval(stopwatchInterval);
            document.getElementById('startBtn').textContent = '시작';
        } else {
            stopwatchInterval = setInterval(() => {
                time++;
                updateDisplay();
            }, 1000);
            document.getElementById('startBtn').textContent = '일시정지';
        }
        isRunning = !isRunning;
    }

    function handleTimer() {
        if (isRunning) {
            clearInterval(timerInterval);
            document.getElementById('startBtn').textContent = '시작';
        } else {
            if (time <= 0) {
                time = getTimerInputValue();
                if (time <= 0) return;
            }
            timerInterval = setInterval(() => {
                if (time <= 0) {
                    clearInterval(timerInterval);
                    handleTimerEnd();
                    return;
                }
                time--;
                updateDisplay();
            }, 1000);
            document.getElementById('startBtn').textContent = '일시정지';
        }
        isRunning = !isRunning;
    }

    function handleTimerEnd() {
        const timerSound = document.getElementById('timerSound');
        timerSound.play().catch(function (error) {
            console.error("오디오 재생 오류:", error);
        });

        alert('타이머가 종료되었습니다!');
        
        timerSound.pause();
        timerSound.currentTime = 0;

        resetAll();
    }
    
    function getTimerInputValue() {
        const hours = parseInt(document.getElementById('hoursInput').value) || 0;
        const minutes = parseInt(document.getElementById('minutesInput').value) || 0;
        const seconds = parseInt(document.getElementById('secondsInput').value) || 0;
        return hours * 3600 + minutes * 60 + seconds;
    }

    function resetAll() {
        clearInterval(stopwatchInterval);
        clearInterval(timerInterval);
        time = 0;
        isRunning = false;
        updateDisplay();
        document.getElementById('startBtn').textContent = '시작';
    }

    function updateDisplay() {
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = time % 60;
        
        document.getElementById('timeDisplay').textContent = 
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // TodoList 기능
    const todoInput = document.getElementById('todoInput');
    const addTodoBtn = document.getElementById('addTodo');
    const todoList = document.getElementById('todoList');

    addTodoBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTodo();
        }
    });

    function addTodo() {
        const todoText = todoInput.value.trim();
        if (!todoText) return;

        const todoItem = document.createElement('li');
        todoItem.className = 'todo-item';
        
        const todoLeft = document.createElement('div');
        todoLeft.className = 'todo-left';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', function() {
            todoContent.style.textDecoration = this.checked ? 'line-through' : 'none';
            saveTodos();
        });
        
        const todoContent = document.createElement('div');
        todoContent.className = 'todo-content';
        todoContent.textContent = todoText;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-todo';
        deleteBtn.textContent = '삭제';
        deleteBtn.onclick = function() {
            todoItem.remove();
            saveTodos();
        };

        todoLeft.appendChild(checkbox);
        todoLeft.appendChild(todoContent);
        todoItem.appendChild(todoLeft);
        todoItem.appendChild(deleteBtn);
        todoList.appendChild(todoItem);

        todoInput.value = '';
        saveTodos();
    }

    function saveTodos() {
        const todos = [];
        document.querySelectorAll('.todo-item').forEach(item => {
            todos.push({
                text: item.querySelector('.todo-content').textContent,
                completed: item.querySelector('input[type="checkbox"]').checked
            });
        });
        localStorage.setItem('studyTodos', JSON.stringify(todos));
    }

    function loadTodos() {
        const savedTodos = localStorage.getItem('studyTodos');
        if (savedTodos) {
            JSON.parse(savedTodos).forEach(todo => {
                const todoItem = document.createElement('li');
                todoItem.className = 'todo-item';
                
                const todoLeft = document.createElement('div');
                todoLeft.className = 'todo-left';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = todo.completed;
                checkbox.addEventListener('change', function() {
                    todoContent.style.textDecoration = this.checked ? 'line-through' : 'none';
                    saveTodos();
                });
                
                const todoContent = document.createElement('div');
                todoContent.className = 'todo-content';
                todoContent.textContent = todo.text;
                todoContent.style.textDecoration = todo.completed ? 'line-through' : 'none';
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-todo';
                deleteBtn.textContent = '삭제';
                deleteBtn.onclick = function() {
                    todoItem.remove();
                    saveTodos();
                };

                todoLeft.appendChild(checkbox);
                todoLeft.appendChild(todoContent);
                todoItem.appendChild(todoLeft);
                todoItem.appendChild(deleteBtn);
                todoList.appendChild(todoItem);
            });
        }
    }

    // 페이지 로드 시 저장된 할 일 목록 불러오기
    loadTodos();

    // 메모 기능
    const memoTextarea = document.getElementById('studyMemo');
    const saveMemoBtn = document.getElementById('saveMemo');
    const memoList = document.getElementById('memoList');

    if (saveMemoBtn) {  // null 체크 추가
        saveMemoBtn.addEventListener('click', saveMemo);
    }

    function saveMemo() {
        const memoText = memoTextarea.value.trim();
        if (!memoText) return;

        // 새로운 메모 아이템 생성
        const memoItem = document.createElement('li');
        memoItem.className = 'memo-item';
        
        const memoContent = document.createElement('div');
        memoContent.className = 'memo-content';
        memoContent.textContent = memoText;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-memo';
        deleteBtn.textContent = '삭제';
        deleteBtn.onclick = function() {
            memoItem.remove();
            saveMemos();
        };

        memoItem.appendChild(memoContent);
        memoItem.appendChild(deleteBtn);
        memoList.appendChild(memoItem);

        // 입력창 초기화 및 저장
        memoTextarea.value = '';
        saveMemos();
    }

    // 메모 저장 함수
    function saveMemos() {
        const memos = [];
        document.querySelectorAll('.memo-item .memo-content').forEach(memo => {
            memos.push(memo.textContent);
        });
        localStorage.setItem('studyMemos', JSON.stringify(memos));
    }

    // 저장된 메모 불러오기
    function loadMemos() {
        const savedMemos = localStorage.getItem('studyMemos');
        if (savedMemos) {
            JSON.parse(savedMemos).forEach(memoText => {
                const memoItem = document.createElement('li');
                memoItem.className = 'memo-item';
                
                const memoContent = document.createElement('div');
                memoContent.className = 'memo-content';
                memoContent.textContent = memoText;
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-memo';
                deleteBtn.textContent = '삭제';
                deleteBtn.onclick = function() {
                    memoItem.remove();
                    saveMemos();
                };

                memoItem.appendChild(memoContent);
                memoItem.appendChild(deleteBtn);
                memoList.appendChild(memoItem);
            });
        }
    }

    // Enter 키로 메모 저장
    if (memoTextarea) {  // null 체크 추가
        memoTextarea.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveMemo();
            }
        });
    }

    // 페이지 로드 시 저장된 메모 불러오기
    loadMemos();
});