import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Cell, GameState, GameConfig, GameStatus, Difficulty, DIFFICULTY_PRESETS, CellAction } from './types';
import { GameBoard } from './components/GameBoard';
import { GameControls } from './components/GameControls';
import { StatisticsModal } from './components/StatisticsModal';
import { SettingsModal } from './components/SettingsModal';
import { useGameLogic } from './hooks/useGameLogic';
import { useStatistics } from './hooks/useStatistics';

const { width } = Dimensions.get('window');

export const MineGameScreen: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [showStatistics, setShowStatistics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const {
    gameState,
    initializeGame,
    handleCellPress,
    handleCellLongPress,
    resetGame,
    changeDifficulty,
    elapsedTime
  } = useGameLogic(difficulty);
  
  const {
    statistics,
    updateStatistics,
    resetStatistics
  } = useStatistics();

  useEffect(() => {
    if (gameState.status === 'won' || gameState.status === 'lost') {
      updateStatistics(gameState.status === 'won', difficulty, elapsedTime);
    }
  }, [gameState.status, difficulty, elapsedTime]);

  const handleDifficultyChange = useCallback((newDifficulty: Difficulty) => {
    changeDifficulty(newDifficulty);
    setDifficulty(newDifficulty);
  }, [changeDifficulty]);

  const handleRestart = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const handleCellAction = useCallback((x: number, y: number, action: CellAction) => {
    switch (action) {
      case 'reveal':
        handleCellPress(x, y);
        break;
      case 'flag':
        handleCellLongPress(x, y);
        break;
      case 'question':
        // Toggle question mark
        break;
      case 'clear':
        // Clear revealed cells
        break;
    }
  }, [handleCellPress, handleCellLongPress]);

  const renderGameStatus = () => {
    switch (gameState.status) {
      case 'won':
        return <Text style={[styles.statusText, styles.wonText]}>🎉 You Win!</Text>;
      case 'lost':
        return <Text style={[styles.statusText, styles.lostText]}>💥 Game Over</Text>;
      case 'playing':
        return <Text style={styles.statusText}>⏱️ Playing...</Text>;
      default:
        return <Text style={styles.statusText}>😊 Ready</Text>;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowStatistics(true)}
          >
            <Text style={styles.icon}>📊</Text>
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Minesweeper</Text>
            {renderGameStatus()}
          </View>
          
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowSettings(true)}
          >
            <Text style={styles.icon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gameInfo}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Mines</Text>
            <Text style={styles.infoValue}>{gameState.flagsRemaining}</Text>
          </View>
          
          <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
            <Text style={styles.restartIcon}>
              {gameState.status === 'lost' ? '😵' : 
               gameState.status === 'won' ? '😎' : '🙂'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>
              {Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:
              {(elapsedTime % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        </View>

        <GameControls
          difficulty={difficulty}
          onDifficultyChange={handleDifficultyChange}
          onRestart={handleRestart}
        />

        <GameBoard
          cells={gameState.cells}
          onCellPress={(x, y) => handleCellAction(x, y, 'reveal')}
          onCellLongPress={(x, y) => handleCellAction(x, y, 'flag')}
          gameStatus={gameState.status}
        />

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>How to Play:</Text>
          <Text style={styles.instruction}>• Tap to reveal a cell</Text>
          <Text style={styles.instruction}>• Long press to flag/unflag</Text>
          <Text style={styles.instruction}>• Reveal all non-mine cells to win</Text>
          <Text style={styles.instruction}>• First click is always safe</Text>
        </View>
      </ScrollView>

      <StatisticsModal
        visible={showStatistics}
        statistics={statistics}
        onClose={() => setShowStatistics(false)}
        onReset={resetStatistics}
      />

      <SettingsModal
        visible={showSettings}
        difficulty={difficulty}
        onDifficultyChange={handleDifficultyChange}
        onClose={() => setShowSettings(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconButton: {
    padding: 10,
  },
  icon: {
    fontSize: 24,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  wonText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  lostText: {
    color: '#F44336',
    fontWeight: '600',
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoBox: {
    alignItems: 'center',
    minWidth: 80,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  restartButton: {
    backgroundColor: '#2196F3',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  restartIcon: {
    fontSize: 32,
  },
  instructions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});