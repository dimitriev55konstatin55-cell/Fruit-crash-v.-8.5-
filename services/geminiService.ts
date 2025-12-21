
import { CANDY_COLORS } from '../constants';

const PRAISES = ["Хо-хо-хо!", "Морозно!", "Отлично!", "Волшебно!", "Вкусно!", "Ледяной!", "Ух ты!", "Спасибо!", "Свежо!"];

// Генерация уровня (Чистая математика, без ИИ)
const generateOfflineLevel = (level: number) => {
    const isCollectLevel = Math.random() < 0.6; 
    const levelType = isCollectLevel ? 'collect' : 'score';

    let targetScore = 0;
    const targetFruits = [];

    if (levelType === 'score') {
        // УПРОЩЕНО: Меньше очков для победы
        targetScore = 800 + (level * 150); 
    } else {
        targetScore = 300 + (level * 50);

        const targetsCount = Math.min(4, 2 + Math.floor((level) / 5));
        const availableColors = [...CANDY_COLORS].sort(() => 0.5 - Math.random());
        
        for (let i = 0; i < targetsCount; i++) {
            const color = availableColors[i];
            const count = 6 + Math.floor(level * 0.5); 
            targetFruits.push({ color, count });
        }
    }

    const stories = [
        "Дядя Макар (он же Дед Мороз) проверяет списки.",
        "Сани Дяди Макара требуют подзарядки фруктами.",
        "Снеговики помогают Дяде Макару в саду.",
        "Маскировка Деда Мороза почти идеальна.",
        "Нужно наполнить ледяной погреб Дяди Макара.",
        "Эльфы устроили соревнование по сбору.",
        "Дядя Макар готовит волшебный компот.",
        "Северное сияние освещает сад Макара.",
        "Замерзшие ветки хранят самые сладкие плоды.",
        "Дядя Макар надевает красную шубу."
    ];

    let objectiveText = "";
    if (levelType === 'score') {
        objectiveText = `Уровень ${level}: Набери ${targetScore} очков!`;
    } else {
        objectiveText = `Уровень ${level}: Собери фрукты!`;
    }

    return { 
      levelType,
      objective: objectiveText,
      storySegment: stories[level % stories.length] || "Зима близко...",
      targetScore,
      targetFruits
    };
};

// Функция теперь просто возвращает готовый объект
export const getLevelObjective = async (level: number) => {
  return generateOfflineLevel(level);
};

export const getAICommentary = async (scoreDelta: number) => {
  return PRAISES[Math.floor(Math.random() * PRAISES.length)];
};
