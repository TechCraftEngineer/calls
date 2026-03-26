#!/usr/bin/env python3
"""
Main entry point for HuggingFace Spaces deployment
This file handles the specific requirements for HF Spaces
"""

import os
import sys
import logging

# Set up logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_hf_environment():
    """Setup environment specific to HuggingFace Spaces"""
    
    # Установка токена из переменной окружения
    hf_token = os.environ.get('HF_TOKEN')
    if hf_token:
        os.environ['HF_TOKEN'] = hf_token
        logger.info("HF_TOKEN найден и установлен")
    else:
        logger.warning("HF_TOKEN не найден в переменных окружения")
        logger.warning("Для работы с длинными аудио установите HF_TOKEN в Secrets")
    
    # Check if we're in HF Spaces
    space_id = os.environ.get('SPACE_ID')
    if space_id:
        logger.info(f"Running in HuggingFace Spaces: {space_id}")
        
        # Optimize for Spaces
        os.environ['PYTHONUNBUFFERED'] = '1'
        os.environ['PYTHONDONTWRITEBYTECODE'] = '1'
        
        return True
    
    logger.info("Running in local environment")
    return False

def main():
    """Main entry point"""
    
    # Setup HF environment
    is_hf_spaces = setup_hf_environment()
    
    try:
        from app import app
        import uvicorn
        
        # Определяем порт и хост
        port = int(os.environ.get('PORT', 7860))
        host = "0.0.0.0"
        
        if is_hf_spaces:
            logger.info(f"Starting app with HF Spaces configuration on {host}:{port}")
        else:
            logger.info(f"Starting app with local configuration on {host}:{port}")
        
        uvicorn.run(
            app,
            host=host,
            port=port,
            log_level="info"
        )
        
    except Exception as e:
        logger.error(f"Failed to start application: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
