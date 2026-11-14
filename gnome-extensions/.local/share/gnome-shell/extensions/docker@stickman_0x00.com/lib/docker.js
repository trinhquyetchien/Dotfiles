
import GLib from 'gi://GLib'
import Gio from 'gi://Gio'

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import DockerManager from './dockerManager.js';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

// Retries used by the Docker daemon when a healthcheck doesn't set one
const DOCKER_DEFAULT_HEALTH_RETRIES = 3;

const by_name = (a, b) => {
	if (a.name < b.name) return -1;
	if (a.name > b.name) return 1;
	// equal name
	return 0;
};

export default class DockerAPI {
	constructor() {
		/**
		* Docker commands
		* `keep_menu_open` commands change the state in place, the menu stays open to show it.
		* `confirm` commands ask before running.
		* @type {Array.<{label: string, command: string, icon: string, keep_menu_open: boolean, confirm: boolean}>}
		*/
		DockerAPI._docker_commands = {
			// Service
			s_start: {
				label: _("Start docker"),
				command: "systemctl start docker"
			},
			s_running: {
				label: _("Check if running"),
				command: "systemctl is-active --quiet docker.socket"
			},
			// Container commands
			c_start: {
				label: _("Start"),
				command: "start",
				keep_menu_open: true,
				icon: "media-playback-start"
			},
			c_start_i: {
				label: _("Start interactive"),
				command: "start -i",
				icon: "utilities-terminal"
			},
			c_restart: {
				label: _("Restart"),
				command: "restart",
				keep_menu_open: true,
				icon: "object-rotate-left"
			},
			c_stop: {
				label: _("Stop"),
				command: "stop",
				keep_menu_open: true,
				icon: "media-playback-stop"
			},
			c_pause: {
				label: _("Pause"),
				command: "pause",
				keep_menu_open: true,
				icon: "media-playback-pause"
			},
			c_unpause: {
				label: _("Unpause"),
				command: "unpause",
				keep_menu_open: true,
				icon: "media-playback-start"
			},
			c_rm: {
				label: _("Remove"),
				command: "rm",
				icon: "edit-delete",
				confirm: true
			},
			c_exec: {
				label: _("Exec Bash"),
				command: "exec -it",
				icon: "utilities-terminal"
			},
			c_attach: {
				label: _("Attach Terminal"),
				command: "attach",
				icon: "emblem-symbolic-link"
			},
			c_inspect: {
				label: _("Inspect"),
				command: "inspect",
				icon: "user-info"
			},
			c_logs: {
				label: _("View logs"),
				command: "logs -f",
				icon: "format-justify-fill"
			},

			compose_logs: {
				compose: true,
				label: _("View logs"),
				icon: "format-justify-fill"
			},

			compose_up: {
				compose: true,
				label: _("Up"),
				command: "up -d",
				keep_menu_open: true,
				icon: "media-playback-start"
			},
			compose_restart: {
				compose: true,
				label: _("Restart"),
				keep_menu_open: true,
				icon: "object-rotate-left"
			},
			compose_stop: {
				compose: true,
				label: _("Stop"),
				command: "stop",
				keep_menu_open: true,
				icon: "media-playback-stop"
			},
			compose_rm: {
				compose: true,
				label: _("Remove"),
				command: "down",
				icon: "edit-delete",
				confirm: true
			},

			// Img commands
			i_rm: {
				label: _("Remove"),
				command: "rmi -f",
				icon: "edit-delete",
				confirm: true
			},
			i_run: {
				label: _("Run"),
				command: "run --rm -d",
				keep_menu_open: true,
				icon: "media-playback-start"
			},
			i_run_i: {
				label: _("Run interactive"),
				command: "run --rm -it",
				icon: "utilities-terminal"
			},
			i_inspect: {
				label: _("Inspect"),
				command: "inspect",
				icon: "user-info"
			}
		}

		DockerAPI.exec_communicate("which docker")
			.then((output) => {
				if (output.includes("snap")) {
					this._set_snaps();
				}
			})
			.catch((_err) => { });
	}

	_set_snaps() {
		DockerAPI._docker_commands.s_start.command = "pkexec snap start docker";
		DockerAPI._docker_commands.s_running.command = "systemctl is-active --quiet snap.docker.dockerd";
	}

	destroy() {
		DockerAPI._docker_commands = null;
	}

	static spawn_command_line_async(c) {
		const exe = c.split(' ')[0];
		if (!GLib.find_program_in_path(exe)) {
			const msg = _('"%s" not found. Update the Terminal setting in extension Preferences.').replace('%s', exe);
			Main.notifyError('Docker', msg);
			return;
		}
		GLib.spawn_command_line_async(c);
	}

	static get docker_commands() {
		return DockerAPI._docker_commands;
	}

	/**
	 * Commands of a container in the given state, in menu order.
	 * @param {string} state
	 * @return {Array.<Object>}
	 */
	static container_commands(state) {
		const c = DockerAPI._docker_commands;
		let commands;
		switch (state) {
			case "running":
				commands = [c.c_exec, c.c_attach, c.c_pause, c.c_stop, c.c_restart];
				break;
			case "paused":
				commands = [c.c_unpause, c.c_stop, c.c_restart];
				break;
			default:
				commands = [c.c_start, c.c_start_i];
		}

		return [...commands, c.c_logs, c.c_inspect, c.c_rm];
	}

	/**
	 * Compose commands of a container in the given state, in menu order.
	 * @param {string} state
	 * @return {Array.<Object>}
	 */
	static compose_commands(state) {
		const c = DockerAPI._docker_commands;
		const commands = state === "running"
			? [c.compose_restart, c.compose_stop]
			: [c.compose_up, c.compose_rm];

		// View logs (always available)
		return [...commands, c.compose_logs];
	}

	/**
	 * Commands of an image, in menu order.
	 * @return {Array.<Object>}
	 */
	static image_commands() {
		const c = DockerAPI._docker_commands;
		return [c.i_run, c.i_run_i, c.i_inspect, c.i_rm];
	}

	/**
	 * Map a container health status string to a translated display label.
	 * @param {string|null} health
	 * @return {string}
	 */
	static health_label(health) {
		const labels = {
			'starting': _('Starting'),
			'healthy': _('Healthy'),
			'unhealthy': _('Unhealthy'),
		};
		return health ? (labels[health] ?? health) : _('None');
	}

	/**
	 * Resolve the health status of an inspected container.
	 * Docker forces the status to "unhealthy" when a container stops, so for
	 * non-running containers derive the last known status from the probe results.
	 * @param {Object} container output of docker inspect
	 * @return {string|null}
	 */
	static container_health(container) {
		const health = container.State.Health;
		if (!health) return null;
		if (container.State.Running) return health.Status;

		// Never probed during its last run
		if (!health.Log || !health.Log.length) return null;

		const retries = container.Config.Healthcheck?.Retries || DOCKER_DEFAULT_HEALTH_RETRIES;
		return health.FailingStreak >= retries ? 'unhealthy' : 'healthy';
	}

	/**
	 * Check if docker service is running
	 * @return {Promise<Boolean>} whether docker service is running or not
	 */
	static async is_docker_running() {
		let is_running = false;

		await this.exec_communicate(this._docker_commands.s_running.command)
			.then(() => { is_running = true })
			.catch((_err) => { });

		return is_running;
	}

	/**
	 * Get docker version
	 * @return {Promise<Number>}
	 */
	static async docker_version() {
		let version = 0;
		await this.exec_communicate(`docker --version`)
			.then((output) => { version = +output.split(' ')[2].split('.')[0]; })
			.catch((_err) => { });

		return version;
	}

	/**
	 * Get total number of containers running-
	 * @return {Promise<string>}
	 */
	static async get_containers_running() {
		let out = "";

		await this.exec_communicate("docker ps -q -f status=running")
			.then((output) => { out += output.split("\n").filter((i) => i !== "").length; })
			.catch((_err) => { });

		return out;
	}


	/**
	 * Return containers name and status.
	 * @return {Promise<Array.<{
	 * id: String,
	 * name: String,
	 * state: String,
	 * ip: String,
	 * ip_prefix: String,
	 * gateway: String,
	 * ports: String,
	 * compose_project: String,
	 * compose_dir: String}>>} every object represents a container
	 */
	static async get_containers() {
		const ids = await this._exec_or_notify("docker ps -aq");
		if (!ids.length) {
			return [];
		}

		const out = await this._exec_or_notify(`docker inspect --format '{{json .}}' `.concat(ids));
		if (!out.length) {
			return [];
		}

		// Found containers
		return out
			.split("\n")
			.map(container => {
				container = JSON.parse(container);

				// First network of the container
				const network = Object.values(container.NetworkSettings?.Networks ?? {})[0];

				return {
					id: container.Id,
					name: container.Name.slice(1),
					state: container.State.Status,
					health: DockerAPI.container_health(container),
					ip: network?.IPAddress,
					ip_prefix: network?.IPPrefixLen ?? "",
					gateway: network?.Gateway,
					ports: container.HostConfig.PortBindings ?? {},
					compose_project: container.Config.Labels['com.docker.compose.project'],
					compose_dir: container.Config.Labels['com.docker.compose.project.working_dir']
				};
			})
			.sort(by_name);
	}

	/**
	 * Return containers name and status.
	 * @return {Promise<Array.<{id: String, name: String}>>} every object represents a container
	 */
	static async get_images() {
		const out = await this._exec_or_notify(`docker images --filter dangling=false --format "{{.ID}};{{.Repository}};{{.Tag}}"`);

		if (!out.length) {
			return [];
		}

		// Found containers
		return out
			.replaceAll("\"", "")
			.split("\n")
			.filter(element => element)
			.map(str => str.split(";"))
			.map(s => {
				return {
					id: s[0],
					name: `${s[1]}:${s[2]}`
				};
			})
			.sort(by_name);
	}

	/**
	 * Run docker command.
	 * @param {docker_commands} command - name of command from the list docker_commands
	 * @param {Object} item - container/image struct
	 */
	static async run_command(command, item) {
		const Settings = DockerManager.settings;
		let c = "";
		switch (command) {
			// TODO: Make text to be translated
			case this.docker_commands.s_start:
				c = command.command;
				item = { name: "" };
				break;
			case this.docker_commands.c_exec:
				this._run_in_terminal(`docker ${command.command} ${item.id} bash`);
				return;
			case this.docker_commands.c_stop:
				c = `docker ${command.command} ${Settings.get_string('stop-command-options')} ${item.id}`;
				break;

			case this.docker_commands.c_attach:
			case this.docker_commands.c_start_i:
			case this.docker_commands.c_inspect:
			case this.docker_commands.i_inspect:
			case this.docker_commands.i_run_i:
				this._run_in_terminal(`docker ${command.command} ${item.id}`);
				return;

			case this.docker_commands.c_logs:
				this._run_in_terminal(`docker logs ${this._logs_tail_flag()} -f ${item.id}`);
				return;

			case this.docker_commands.compose_logs: {
				const compose = await this._compose_bin();
				this._run_in_terminal(`${compose} --project-directory ${GLib.shell_quote(item.compose_dir)} logs ${this._logs_tail_flag()} -f`);
				return;
			}

			case this.docker_commands.compose_up:
			case this.docker_commands.compose_stop:
			case this.docker_commands.compose_rm:
				c = `${await this._compose_bin()} --project-directory ${GLib.shell_quote(item.compose_dir)} ${command.command}`;
				break;
			case this.docker_commands.compose_restart: {
				const compose = `${await this._compose_bin()} --project-directory ${GLib.shell_quote(item.compose_dir)}`;
				c = `${compose} down; ${compose} up -d`;
				break;
			}

			default:
				c = `docker ${command.command} ${item.id}`;
		}

		// Show notification with container name or compose project name if available
		const name = command.compose ? item.compose_project : item.name;

		let subProcess = Gio.Subprocess.new(
			['/bin/sh', '-c', c],
			Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
		);

		subProcess.communicate_utf8_async(null, null, (proc, res) => {
			try {
				let [, , stderr] = proc.communicate_utf8_finish(res);

				if (!proc.get_successful()) {
					throw new Error(stderr);
				}

				Main.notify(`${command.label}`, name);
			} catch (e) {
				Main.notifyError(_('Docker ERROR'), e.toString());
			}
		});
	}

	/**
	 * Run a command in the terminal from the settings, which stays open when the command ends.
	 * @param {string} c
	 */
	static _run_in_terminal(c) {
		const terminal = DockerManager.settings.get_string('terminal');
		this.spawn_command_line_async(`${terminal} ${GLib.shell_quote(`${c}; read -p "Press enter to exit..."`)}`);
	}

	/**
	 * `--tail` option of the logs commands from the settings.
	 * @return {string}
	 */
	static _logs_tail_flag() {
		const Settings = DockerManager.settings;
		return Settings.get_boolean('logs-include-previous') ? `--tail ${Settings.get_int('logs-tail-length')}` : '--tail 0';
	}

	/**
	 * Compose binary of the installed docker version.
	 * @return {Promise<string>}
	 */
	static async _compose_bin() {
		return await this.docker_version() >= 26 ? 'docker compose' : 'docker-compose';
	}

	/**
	 * Execute a command, on failure notify the error and return an empty output.
	 * @param {string} argv
	 * @return {Promise<string>}
	 */
	static async _exec_or_notify(argv) {
		try {
			return await this.exec_communicate(argv);
		} catch (err) {
			Main.notifyError(_('Docker ERROR'), err.toString());
			return "";
		}
	}

	/**
	 * Execute a command asynchronously and return the output from `stdout` on
	 * success or throw an error with output from `stderr` on failure.
	 *
	 * If given, @input will be passed to `stdin` and @cancellable can be used to
	 * stop the process before it finishes.
	 *
	 * @param {string[]} argv - a list of string arguments
	 * @param {string} [input] - Input to write to `stdin` or %null to ignore
	 * @param {Gio.Cancellable} [cancellable] - optional cancellable object
	 * @returns {Promise<string>} - The process output
	 */
	static exec_communicate(argv, input = null, cancellable = null) {
		let cancelId = 0;
		let flags = (Gio.SubprocessFlags.STDOUT_PIPE |
			Gio.SubprocessFlags.STDERR_PIPE);

		if (input !== null)
			flags |= Gio.SubprocessFlags.STDIN_PIPE;

		const [, argv_split] = GLib.shell_parse_argv(argv);
		let subProcess = new Gio.Subprocess({
			argv: argv_split,
			flags: flags
		});
		subProcess.init(cancellable);

		if (cancellable instanceof Gio.Cancellable) {
			cancelId = cancellable.connect(() => subProcess.force_exit());
		}

		return new Promise((resolve, reject) => {
			subProcess.communicate_utf8_async(input, null, (proc, res) => {
				try {
					let [, stdout, stderr] = proc.communicate_utf8_finish(res);
					let status = proc.get_exit_status();

					if (status !== 0) {
						throw new Gio.IOErrorEnum({
							code: Gio.io_error_from_errno(status),
							message: stderr ? stderr.trim() : GLib.strerror(status)
						});
					}

					resolve(stdout.trim());
				} catch (e) {
					// console.error("Fail to execute command: ", argv); // debug
					reject(e);
				} finally {
					if (cancelId > 0) {
						cancellable.disconnect(cancelId);
					}
				}
			});
		});
	}
}
