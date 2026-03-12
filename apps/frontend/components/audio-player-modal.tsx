'use client';

import { API_BASE_URL } from '@/lib/api';
import AudioPlayer from './AudioPlayer';

interface AudioPlayerModalProps {
    filename: string;
    number: string;
    onClose: () => void;
}

export default function AudioPlayerModal({ filename, number, onClose }: AudioPlayerModalProps) {
    const audioUrl = `${API_BASE_URL}/api/records/${filename}`;

    return (
        <div className="audio-modal-overlay" onClick={onClose}>
            <div className="audio-modal-content" onClick={e => e.stopPropagation()}>
                <div className="audio-modal-header">
                    <div className="audio-modal-title">
                        Запись звонка: <strong>{number}</strong>
                    </div>
                    <button className="audio-modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="audio-modal-body">
                    <AudioPlayer src={audioUrl} autoPlay={true} />
                </div>
            </div>

            <style jsx>{`
                .audio-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    backdrop-filter: blur(4px);
                }
                .audio-modal-content {
                    background: white;
                    border-radius: 16px;
                    width: 440px;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.15);
                    padding: 28px;
                    border: 1px solid #eee;
                }
                .audio-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }
                .audio-modal-title {
                    font-size: 14px;
                    color: #666;
                }
                .audio-modal-title strong {
                    color: #111;
                    margin-left: 4px;
                }
                .audio-modal-close {
                    background: #f5f5f7;
                    border: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    font-size: 20px;
                    cursor: pointer;
                    color: #999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .audio-modal-close:hover {
                    background: #eee;
                    color: #333;
                }
                .audio-modal-body {
                    padding-bottom: 8px;
                }
            `}</style>
        </div>
    );
}
