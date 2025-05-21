import React, {useCallback, useEffect, useState} from 'react';
import {AutoSizer, List, type ListRowProps, WindowScroller} from 'react-virtualized';

interface Item {
    id: number;
    value: string;
    selected: boolean;
}

interface ItemApiResponse {
    items: Item[];
    total: number;
}

// Хелпер для debounce
function useDebounce<T>(value: T, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

const App = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [apiError, setApiError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [searchInputValue, setSearchInputValue] = useState('');
    const [draggedItem, setDraggedItem] = useState<Item | null>(null);
    const [totalCount, setTotalCount] = useState(0);

    // Используем debounce для поисковой строки (задержка 500 мс)
    const debouncedSearch = useDebounce(searchInputValue, 500);

    // Загрузка данных
    const loadItems = useCallback(async (reset = false) => {
        if (loading || (!hasMore && !reset)) return;

        setLoading(true);
        const currentPage = reset ? 1 : page;

        console.log("loadItems", currentPage, reset, searchInputValue)

        try {
            const response = await fetch(
                `/api/items?page=${currentPage}&limit=20&search=${encodeURIComponent(searchInputValue)}`
            );
            const data = await response.json() as ItemApiResponse;

            setItems(prev => reset ? data.items : [...prev, ...data.items]);
            setTotalCount(data.total);
            setHasMore(data.items.length === 20);
            if (reset) setPage(2);
            else setPage(prev => prev + 1);

            setApiError(null);
        } catch (error) {
            console.error('Error loading items:', error);
            setApiError(error as Error);
        } finally {
            setLoading(false);
        }
    }, [loading, page, searchInputValue]);

    // Обработчик поиска
    useEffect(() => {
        setPage(1);
        loadItems(true);
    }, [debouncedSearch]);

    // Переключение выбора элемента
    const toggleSelect = async (id: number) => {
        const item = items.find(item => item.id === id);

        if (!item) return;

        item.selected = !item.selected;

        setItems([
            ...items
        ]);

        // Отправляем на сервер
        await fetch('/api/items/select', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id, selected: item.selected})
        });
    };

    // Начало перетаскивания
    const handleDragStart = (e: React.DragEvent<HTMLLabelElement>, index: number) => {
        setDraggedItem(items[index]);
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
        }
    };

    // Перетаскивание
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>, index: number) => {
        e.preventDefault();
        if (!draggedItem) return;

        const draggedIndex = items.findIndex(item => item.id === draggedItem.id);
        if (draggedIndex === index) return;

        setItems(oldItems => {
            const newItems = [...oldItems];
            const [movedItem] = newItems.splice(draggedIndex, 1);
            newItems.splice(index, 0, movedItem);

            return newItems;
        });
    };

    // Сохранение нового порядка на сервере
    const handleDragEnd = useCallback(async () => {
        if (!draggedItem) return;

        const draggedIndex = items.findIndex(item => item.id === draggedItem.id);

        setDraggedItem(null);

        // Отправляем на сервер
        await fetch('/api/items/order', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                itemId: draggedItem.id,
                afterId: draggedIndex > 0 ? items[draggedIndex - 1].id : null
            })
        });
    }, [draggedItem, items]);

    // Костыль: из-за виртуализации списка и пересоздании строк при прокрутке страницы, при перетаскивании, onDragEnd иногда не срабатывает
    useEffect(() => {
        const handler = () => {
            handleDragEnd();
        };
        document.body.addEventListener('drop', handler);
        return () => {
            document.body.removeEventListener('drop', handler);
        };
    }, [draggedItem, handleDragEnd]);

    // Рендер строки
    const rowRenderer = ({key, index, style}: ListRowProps) => {
        const item = items[index];
        if (!item) return null;

        return (
            <label
                key={key}
                style={style}
                className={`item ${item.selected ? 'selected' : ''} ${draggedItem === item ? 'dragging' : ''}`}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
            >
                <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleSelect(item.id)}
                    aria-label={`Select ${item.value}`}
                />
                <span>{item.value}</span>
            </label>
        );
    };

    return (
        <div className="app">
            <div className="source">
                Тестовое задание по вакансии <a href="https://hh.ru/vacancy/119832528" target="_blank" rel="noopener noreferrer">
                    Fullstack-разработчик
                </a> от компании <a href="https://takemycode.com/" target="_blank" rel="noopener noreferrer">
                    ООО Цифровые Решения
                </a>
            </div>

            <div className="controls">
                <input
                    type="text"
                    placeholder="Поиск..."
                    value={searchInputValue}
                    onChange={(e) => setSearchInputValue(e.target.value)}
                />
                <div className="info">
                    Загружено: {Number(items.length).toLocaleString()} / {Number(totalCount).toLocaleString()}
                </div>
            </div>

            <div className="list-container">
                <WindowScroller>
                    {({height, isScrolling, scrollTop}) => (
                        <AutoSizer disableHeight>
                            {({width}) => (
                                <List
                                    autoHeight
                                    width={width}
                                    height={height}
                                    rowCount={items.length}
                                    rowHeight={50}
                                    rowRenderer={rowRenderer}
                                    isScrolling={isScrolling}
                                    scrollTop={scrollTop}
                                    overscanRowCount={5}
                                    onRowsRendered={({startIndex, stopIndex}) => {
                                        console.log("startIndex, stopIndex", startIndex, stopIndex);
                                        if (stopIndex >= items.length - 1) {
                                            loadItems();
                                        }
                                    }}
                                />
                            )}
                        </AutoSizer>
                    )}
                </WindowScroller>

                {apiError && <div className="loading">{String(apiError)}</div>}
                {loading && <div className="loading">Загрузка...</div>}
            </div>
        </div>
    );
};

export default App;