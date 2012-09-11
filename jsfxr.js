/**
 * SfxrParams
 *
 * Copyright 2010 Thomas Vian
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author Thomas Vian
 */
function SfxrParams() {
  //--------------------------------------------------------------------------
  //
  //  Settings String Methods
  //
  //--------------------------------------------------------------------------

  /**
   * Parses a settings string into the parameters
   * @param  string  Settings string to parse
   * @return      If the string successfully parsed
   */
  this.setSettingsString = function setSettingsString(string)
  {
    var values = string.split(",");
    // I (@maettig) removed all parseInt and parseFloat
    this.waveType = values[0] | 0;
    this.attackTime = values[1] * 1 || 0;
    this.sustainTime = values[2] * 1 || 0;
    this.sustainPunch = values[3] * 1 || 0;
    this.decayTime = values[4] * 1 || 0;
    this.startFrequency = values[5] * 1 || 0;
    this.minFrequency = values[6] * 1 || 0;
    this.slide = values[7] * 1 || 0;
    this.deltaSlide = values[8] * 1 || 0;
    this.vibratoDepth = values[9] * 1 || 0;
    this.vibratoSpeed = values[10] * 1 || 0;
    this.changeAmount = values[11] * 1 || 0;
    this.changeSpeed = values[12] * 1 || 0;
    this.squareDuty = values[13] * 1 || 0;
    this.dutySweep = values[14] * 1 || 0;
    this.repeatSpeed = values[15] * 1 || 0;
    this.phaserOffset = values[16] * 1 || 0;
    this.phaserSweep = values[17] * 1 || 0;
    this.lpFilterCutoff = values[18] * 1 || 0;
    this.lpFilterCutoffSweep = values[19] * 1 || 0;
    this.lpFilterResonance = values[20] * 1 || 0;
    this.hpFilterCutoff = values[21] * 1 || 0;
    this.hpFilterCutoffSweep = values[22] * 1 || 0;
    this.masterVolume = values[23] * 1 || 0;
  }
}

/**
 * SfxrSynth
 *
 * Copyright 2010 Thomas Vian
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author Thomas Vian
 */
function SfxrSynth() {
  // All variables are kept alive through function closures

  //--------------------------------------------------------------------------
  //
  //  Sound Parameters
  //
  //--------------------------------------------------------------------------

  this._params = new SfxrParams();  // Params instance

  //--------------------------------------------------------------------------
  //
  //  Synth Variables
  //
  //--------------------------------------------------------------------------

  var _finished;            // If the sound has finished

  var _masterVolume;          // masterVolume * masterVolume (for quick calculations)

  var _waveType;              // The type of wave to generate

  var _envelopeVolume;          // Current volume of the envelope
  var _envelopeStage;            // Current stage of the envelope (attack, sustain, decay, end)
  var _envelopeTime;          // Current time through current enelope stage
  var _envelopeLength;          // Length of the current envelope stage
  var _envelopeLength0;        // Length of the attack stage
  var _envelopeLength1;        // Length of the sustain stage
  var _envelopeLength2;        // Length of the decay stage
  var _envelopeOverLength0;      // 1 / _envelopeLength0 (for quick calculations)
  var _envelopeOverLength1;      // 1 / _envelopeLength1 (for quick calculations)
  var _envelopeOverLength2;      // 1 / _envelopeLength2 (for quick calculations)
  //this._envelopeFullLength;        // Full length of the volume envelop (and therefore sound)

  var _sustainPunch;          // The punch factor (louder at begining of sustain)

  var _phase;                // Phase through the wave
  var _pos;              // Phase expresed as a Number from 0-1, used for fast sin approx
  var _period;              // Period of the wave
  var _periodTemp;            // Period modified by vibrato
  var _maxPeriod;            // Maximum period before sound stops (from minFrequency)

  var _slide;              // Note slide
  var _deltaSlide;            // Change in slide
  var _minFreqency;          // Minimum frequency before stopping

  var _vibratoPhase;          // Phase through the vibrato sine wave
  var _vibratoSpeed;          // Speed at which the vibrato phase moves
  var _vibratoAmplitude;        // Amount to change the period of the wave by at the peak of the vibrato wave

  var _changeAmount;          // Amount to change the note by
  var _changeTime;            // Counter for the note change
  var _changeLimit;            // Once the time reaches this limit, the note changes

  var _squareDuty;            // Offset of center switching point in the square wave
  var _dutySweep;            // Amount to change the duty by

  var _repeatTime;            // Counter for the repeats
  var _repeatLimit;            // Once the time reaches this limit, some of the variables are reset

  var _phaser;            // If the phaser is active
  var _phaserOffset;          // Phase offset for phaser effect
  var _phaserDeltaOffset;        // Change in phase offset
  var _phaserInt;              // Integer phaser offset, for bit maths
  var _phaserPos;              // Position through the phaser buffer
  var _phaserBuffer;      // Buffer of wave values used to create the out of phase second wave

  var _filters;            // If the filters are active
  var _lpFilterPos;          // Adjusted wave position after low-pass filter
  var _lpFilterOldPos;          // Previous low-pass wave position
  var _lpFilterDeltaPos;        // Change in low-pass wave position, as allowed by the cutoff and damping
  var _lpFilterCutoff;          // Cutoff multiplier which adjusts the amount the wave position can move
  var _lpFilterDeltaCutoff;      // Speed of the low-pass cutoff multiplier
  var _lpFilterDamping;        // Damping muliplier which restricts how fast the wave position can move
  var _lpFilterOn;          // If the low pass filter is active

  var _hpFilterPos;          // Adjusted wave position after high-pass filter
  var _hpFilterCutoff;          // Cutoff multiplier which adjusts the amount the wave position can move
  var _hpFilterDeltaCutoff;      // Speed of the high-pass cutoff multiplier

  var _noiseBuffer;      // Buffer of random values used to generate noise

  var _superSample;          // Actual sample writen to the wave
  var _sample;              // Sub-sample calculated 8 times per actual sample, averaged out to get the super sample

  //--------------------------------------------------------------------------
  //
  //  Synth Methods
  //
  //--------------------------------------------------------------------------

  /**
   * Resets the runing variables from the params
   * Used once at the start (total reset) and for the repeat effect (partial reset)
   * @param  totalReset  If the reset is total
   */
  this.reset = function reset(totalReset) {
    // Shorter reference
    var p = this._params;

    _period = 100.0 / (p.startFrequency * p.startFrequency + 0.001);
    _maxPeriod = 100.0 / (p.minFrequency * p.minFrequency + 0.001);

    _slide = 1.0 - p.slide * p.slide * p.slide * 0.01;
    _deltaSlide = -p.deltaSlide * p.deltaSlide * p.deltaSlide * 0.000001;

    if (p.waveType == 0) {
      _squareDuty = 0.5 - p.squareDuty * 0.5;
      _dutySweep = -p.dutySweep * 0.00005;
    }

    if (p.changeAmount > 0.0) {
      _changeAmount = 1.0 - p.changeAmount * p.changeAmount * 0.9;
    } else {
      _changeAmount = 1.0 + p.changeAmount * p.changeAmount * 10.0;
    }

    _changeTime = 0;

    if(p.changeSpeed == 1.0) {
      _changeLimit = 0;
    } else {
      _changeLimit = (1.0 - p.changeSpeed) * (1.0 - p.changeSpeed) * 20000 + 32;
    }

    if(totalReset) {
      p.paramsDirty = false;
      _masterVolume = p.masterVolume * p.masterVolume;

      _waveType = p.waveType;

      if (p.sustainTime < 0.01) {
        p.sustainTime = 0.01;
      }

      var totalTime = p.attackTime + p.sustainTime + p.decayTime;
      if (totalTime < 0.18) {
        var multiplier = 0.18 / totalTime;
        p.attackTime *= multiplier;
        p.sustainTime *= multiplier;
        p.decayTime *= multiplier;
      }

      _sustainPunch = p.sustainPunch;

      _phase = 0;

      _minFreqency = p.minFrequency;

      _filters = p.lpFilterCutoff != 1.0 || p.hpFilterCutoff != 0.0;

      _lpFilterPos = 0.0;
      _lpFilterDeltaPos = 0.0;
      _lpFilterCutoff = p.lpFilterCutoff * p.lpFilterCutoff * p.lpFilterCutoff * 0.1;
      _lpFilterDeltaCutoff = 1.0 + p.lpFilterCutoffSweep * 0.0001;
      _lpFilterDamping = 5.0 / (1.0 + p.lpFilterResonance * p.lpFilterResonance * 20.0) * (0.01 + _lpFilterCutoff);
      if (_lpFilterDamping > 0.8) {
        _lpFilterDamping = 0.8;
      }
      _lpFilterDamping = 1.0 - _lpFilterDamping;
      _lpFilterOn = p.lpFilterCutoff != 1.0;

      _hpFilterPos = 0.0;
      _hpFilterCutoff = p.hpFilterCutoff * p.hpFilterCutoff * 0.1;
      _hpFilterDeltaCutoff = 1.0 + p.hpFilterCutoffSweep * 0.0003;

      _vibratoPhase = 0.0;
      _vibratoSpeed = p.vibratoSpeed * p.vibratoSpeed * 0.01;
      _vibratoAmplitude = p.vibratoDepth * 0.5;

      _envelopeVolume = 0.0;
      _envelopeStage = 0;
      _envelopeTime = 0;
      _envelopeLength0 = p.attackTime * p.attackTime * 100000.0;
      _envelopeLength1 = p.sustainTime * p.sustainTime * 100000.0;
      _envelopeLength2 = p.decayTime * p.decayTime * 100000.0 + 10;
      _envelopeLength = _envelopeLength0;
      this._envelopeFullLength = _envelopeLength0 + _envelopeLength1 + _envelopeLength2 | 0;

      _envelopeOverLength0 = 1.0 / _envelopeLength0;
      _envelopeOverLength1 = 1.0 / _envelopeLength1;
      _envelopeOverLength2 = 1.0 / _envelopeLength2;

      _phaser = p.phaserOffset != 0.0 || p.phaserSweep != 0.0;

      _phaserOffset = p.phaserOffset * p.phaserOffset * 1020.0;
      if(p.phaserOffset < 0.0) {
       _phaserOffset = -_phaserOffset;
      }
      _phaserDeltaOffset = p.phaserSweep * p.phaserSweep * p.phaserSweep * 0.2;
      _phaserPos = 0;

      if(!_phaserBuffer) {
        _phaserBuffer = new Array(1024);
      }
      if(!_noiseBuffer) {
        _noiseBuffer = new Array(32);
      }

      for(var i = 0; i < 1024; i++) {
        _phaserBuffer[i] = 0.0;
      }
      for(i = 0; i < 32; i++) {
        _noiseBuffer[i] = Math.random() * 2.0 - 1.0;
      }

      _repeatTime = 0;

      if (p.repeatSpeed == 0.0) {
        _repeatLimit = 0;
      } else {
        _repeatLimit = parseInt((1.0-p.repeatSpeed) * (1.0-p.repeatSpeed) * 20000) + 32;
      }
    }
  }

  /**
   * Writes the wave to the supplied buffer ByteArray
   * @param  buffer    A ByteArray to write the wave to
   * @return        If the wave is finished
   */
  this.synthWave = function synthWave(buffer, length) {
    _finished = false;

    for(var i = 0; i < length; i++) {
      if (_finished) {
        return i;
      }

      // Repeats every _repeatLimit times, partially resetting the sound parameters
      if(_repeatLimit != 0) {
        if(++_repeatTime >= _repeatLimit) {
          _repeatTime = 0;
          this.reset(false);
        }
      }

      // If _changeLimit is reached, shifts the pitch
      if(_changeLimit != 0) {
        if(++_changeTime >= _changeLimit) {
          _changeLimit = 0;
          _period *= _changeAmount;
        }
      }

      // Acccelerate and apply slide
      _slide += _deltaSlide;
      _period *= _slide;

      // Checks for frequency getting too low, and stops the sound if a minFrequency was set
      if(_period > _maxPeriod) {
        _period = _maxPeriod;
        if(_minFreqency > 0.0) {
          _finished = true;
        }
      }

      _periodTemp = _period;

      // Applies the vibrato effect
      if(_vibratoAmplitude > 0.0) {
        _vibratoPhase += _vibratoSpeed;
        _periodTemp = _period * (1.0 + Math.sin(_vibratoPhase) * _vibratoAmplitude);
      }

      _periodTemp = parseInt(_periodTemp);
      if(_periodTemp < 8) {
        _periodTemp = 8;
      }

      // Sweeps the square duty
      if (_waveType == 0) {
        _squareDuty += _dutySweep;
        if(_squareDuty < 0.0) {
          _squareDuty = 0.0;
        } else if (_squareDuty > 0.5) {
          _squareDuty = 0.5;
        }
      }

      // Moves through the different stages of the volume envelope
      if(++_envelopeTime > _envelopeLength) {
        _envelopeTime = 0;

        switch(++_envelopeStage)  {
          case 1:
            _envelopeLength = _envelopeLength1;
            break;
          case 2:
             _envelopeLength = _envelopeLength2;
             break;
        }
      }

      // Sets the volume based on the position in the envelope
      switch(_envelopeStage) {
        case 0:
          _envelopeVolume = _envelopeTime * _envelopeOverLength0;
          break;
        case 1:
           _envelopeVolume = 1.0 + (1.0 - _envelopeTime * _envelopeOverLength1) * 2.0 * _sustainPunch;
           break;
        case 2:
           _envelopeVolume = 1.0 - _envelopeTime * _envelopeOverLength2;
           break;
        case 3:
           _envelopeVolume = 0.0; _finished = true;
           break;
      }

      // Moves the phaser offset
      if (_phaser) {
        _phaserOffset += _phaserDeltaOffset;
        _phaserInt = parseInt(_phaserOffset);
        if(_phaserInt < 0) {
          _phaserInt = -_phaserInt;
        } else if (_phaserInt > 1023) {
          _phaserInt = 1023;
        }
      }

      // Moves the high-pass filter cutoff
      if(_filters && _hpFilterDeltaCutoff != 0.0) {
        _hpFilterCutoff *= _hpFilterDeltaCutoff;
        if(_hpFilterCutoff < 0.00001) {
          _hpFilterCutoff = 0.00001;
        } else if(_hpFilterCutoff > 0.1) {
          _hpFilterCutoff = 0.1;
        }
      }

      _superSample = 0.0;
      for(var j = 0; j < 8; j++) {
        // Cycles through the period
        _phase++;
        if(_phase >= _periodTemp) {
          _phase = _phase - _periodTemp;

          // Generates new random noise for this period
          if(_waveType == 3) {
            for(var n = 0; n < 32; n++) {
              _noiseBuffer[n] = Math.random() * 2.0 - 1.0;
            }
          }
        }

        // Gets the sample from the oscillator
        switch(_waveType) {
          case 0: // Square wave
            _sample = ((_phase / _periodTemp) < _squareDuty) ? 0.5 : -0.5;
            break;
          case 1: // Saw wave
            _sample = 1.0 - (_phase / _periodTemp) * 2.0;
            break;
          case 2: // Sine wave (fast and accurate approx)
            _pos = _phase / _periodTemp;
            _pos = _pos > 0.5 ? (_pos - 1.0) * 6.28318531 : _pos * 6.28318531;
            _sample = _pos < 0 ? 1.27323954 * _pos + .405284735 * _pos * _pos : 1.27323954 * _pos - 0.405284735 * _pos * _pos;
            _sample = _sample < 0 ? .225 * (_sample *-_sample - _sample) + _sample : .225 * (_sample * _sample - _sample) + _sample;
            break;
          case 3: // Noise
            _sample = _noiseBuffer[Math.abs(parseInt(_phase * 32 / parseInt(_periodTemp)))];
            break;
        }

        // Applies the low and high pass filters
        if (_filters) {
          _lpFilterOldPos = _lpFilterPos;
          _lpFilterCutoff *= _lpFilterDeltaCutoff;
          if(_lpFilterCutoff < 0.0) {
            _lpFilterCutoff = 0.0;
          } else if(_lpFilterCutoff > 0.1) {
            _lpFilterCutoff = 0.1;
          }

          if(_lpFilterOn) {
            _lpFilterDeltaPos += (_sample - _lpFilterPos) * _lpFilterCutoff;
            _lpFilterDeltaPos *= _lpFilterDamping;
          } else {
            _lpFilterPos = _sample;
            _lpFilterDeltaPos = 0.0;
          }

          _lpFilterPos += _lpFilterDeltaPos;

          _hpFilterPos += _lpFilterPos - _lpFilterOldPos;
          _hpFilterPos *= 1.0 - _hpFilterCutoff;
          _sample = _hpFilterPos;
        }

        // Applies the phaser effect
        if (_phaser) {
          _phaserBuffer[_phaserPos&1023] = _sample;
          _sample += _phaserBuffer[(_phaserPos - _phaserInt + 1024) & 1023];
          _phaserPos = (_phaserPos + 1) & 1023;
        }

        _superSample += _sample;
      }

      // Averages out the super samples and applies volumes
      _superSample *= 0.125 * _envelopeVolume * _masterVolume;

      // Clipping if too loud
      buffer[i] = _superSample >= 1 ? 32767 : _superSample <= -1 ? -32768 : _superSample * 32767 | 0;
    }

    return length;
  }
}

// Originally adapted from http://html5-demos.appspot.com/static/html5-whats-new/template/index.html#31
// Now adapted from http://codebase.es/riffwave/
var synth = new SfxrSynth();
// Export for the Closure Compiler
window['jsfxr'] = function(str) {
  // Initialize SfxrParams
  synth._params.setSettingsString(str);
  // Synthesize Wave
  synth.reset(true);
  var data = new Uint8Array(((synth._envelopeFullLength + 1) / 2 | 0) * 4 + 44);
  var used = synth.synthWave(new Uint16Array(data.buffer, 44), synth._envelopeFullLength) * 2;
  var dv = new Uint32Array(data.buffer, 0, 44);
  // Initialize header
  dv[0] = 0x46464952; // "RIFF"
  dv[1] = used + 36;  // put total size here
  dv[2] = 0x45564157; // "WAVE"
  dv[3] = 0x20746D66; // "fmt "
  dv[4] = 0x00000010; // size of the following
  dv[5] = 0x00010001; // Mono: 1 channel, PCM format
  dv[6] = 0x0000AC44; // 44,100 samples per second
  dv[7] = 0x00015888; // byte rate: two bytes per sample
  dv[8] = 0x00100002; // 16 bits per sample, aligned on every two bytes
  dv[9] = 0x61746164; // "data"
  dv[10] = used;      // put number of samples here

  // Base64 encoding written by me, @maettig
  used += 44;
  var i = 0,
    base64Characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    output = 'data:audio/wav;base64,';
  for (; i < used; i += 3)
  {
    var a = data[i] << 16 | data[i + 1] << 8 | data[i + 2];
    output += base64Characters[a >> 18] + base64Characters[a >> 12 & 63] + base64Characters[a >> 6 & 63] + base64Characters[a & 63];
  }
  i -= used;
  return output.slice(0, output.length - i) + '=='.slice(0, i);
}